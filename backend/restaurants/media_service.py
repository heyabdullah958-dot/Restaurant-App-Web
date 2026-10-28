import logging
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)

MAX_POSTS_PER_RESTAURANT = 10
MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024  # 30 MB


def delete_media_post(post):
    """
    Deletes Cloudinary asset (if public_id exists) and removes DB record.
    Safe against network failures.
    """
    if post.cloudinary_public_id:
        try:
            import cloudinary.uploader
            res_type = 'video' if post.media_type == 'VIDEO' else 'image'
            cloudinary.uploader.destroy(post.cloudinary_public_id, resource_type=res_type)
            logger.info(f"Destroyed Cloudinary asset: {post.cloudinary_public_id} ({res_type})")
        except Exception as e:
            logger.warning(f"Could not destroy Cloudinary asset {post.cloudinary_public_id}: {e}")

    post.delete()


def purge_overflow_media_posts(restaurant):
    """
    10-Video FIFO Auto-Cleanup Rule:
    Keeps only the newest MAX_POSTS_PER_RESTAURANT posts for a given restaurant.
    Any posts created beyond the newest 10 are purged in FIFO order.
    """
    from .models import RestaurantMediaPost
    posts = list(RestaurantMediaPost.objects.filter(restaurant=restaurant).order_by('-created_at', '-id'))
    if len(posts) > MAX_POSTS_PER_RESTAURANT:
        overflow_posts = posts[MAX_POSTS_PER_RESTAURANT:]
        for old_post in overflow_posts:
            logger.info(f"Purging overflow post #{old_post.id} '{old_post.title}' for {restaurant.name}")
            delete_media_post(old_post)


def handle_media_upload_or_url(media_file=None, direct_url='', media_type='VIDEO', request=None):
    """
    Processes either an uploaded file or a direct media URL.
    Returns: dict(media_url, thumbnail_url, cloudinary_public_id, media_type)
    """
    # 1. Direct URL provided
    if direct_url and not media_file:
        url = direct_url.strip()
        detected_type = media_type
        if any(url.lower().endswith(ext) for ext in ['.mp4', '.mov', '.webm', '.m4v']):
            detected_type = 'VIDEO'
        elif any(url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp']):
            detected_type = 'IMAGE'

        thumbnail = ''
        if detected_type == 'VIDEO' and 'res.cloudinary.com' in url:
            thumbnail = url.rsplit('.', 1)[0] + '.jpg'
        elif detected_type == 'VIDEO':
            thumbnail = url.rsplit('.', 1)[0] + '.jpg'
        else:
            thumbnail = url

        return {
            'media_url': url,
            'thumbnail_url': thumbnail,
            'cloudinary_public_id': '',
            'media_type': detected_type
        }

    # 2. File uploaded
    if media_file:
        if media_file.size > MAX_UPLOAD_SIZE_BYTES:
            raise ValueError(f"File size exceeds the 30 MB limit ({media_file.size / (1024 * 1024):.1f} MB).")

        content_type = getattr(media_file, 'content_type', '') or ''
        is_video = (media_type == 'VIDEO') or content_type.startswith('video/')
        detected_type = 'VIDEO' if is_video else 'IMAGE'

        # Check if Cloudinary is active
        is_cloudinary_active = getattr(settings, '_CLOUDINARY_ACTIVE', False) or bool(
            getattr(settings, 'CLOUDINARY_CLOUD_NAME', '') and
            getattr(settings, 'CLOUDINARY_API_KEY', '')
        )

        if is_cloudinary_active:
            try:
                import cloudinary.uploader
                if detected_type == 'VIDEO':
                    res = cloudinary.uploader.upload(
                        media_file,
                        resource_type='video',
                        folder='foodsphere/dine_in_videos',
                        eager=[{
                            'format': 'mp4',
                            'transformation': [{'quality': 'auto:good'}, {'fetch_format': 'mp4'}]
                        }]
                    )
                    sec_url = res.get('secure_url', '')
                    pub_id = res.get('public_id', '')
                    thumb_url = sec_url.rsplit('.', 1)[0] + '.jpg' if sec_url else ''
                    return {
                        'media_url': sec_url,
                        'thumbnail_url': thumb_url,
                        'cloudinary_public_id': pub_id,
                        'media_type': 'VIDEO'
                    }
                else:
                    res = cloudinary.uploader.upload(
                        media_file,
                        resource_type='image',
                        folder='foodsphere/dine_in_posts'
                    )
                    sec_url = res.get('secure_url', '')
                    pub_id = res.get('public_id', '')
                    return {
                        'media_url': sec_url,
                        'thumbnail_url': sec_url,
                        'cloudinary_public_id': pub_id,
                        'media_type': 'IMAGE'
                    }
            except Exception as e:
                logger.warning(f"Cloudinary upload failed, falling back to local media storage: {e}")

        # Local fallback file storage
        ext = os.path.splitext(media_file.name)[1].lower()
        if not ext:
            ext = '.mp4' if detected_type == 'VIDEO' else '.jpg'
        subfolder = 'dine_in_videos' if detected_type == 'VIDEO' else 'dine_in_posts'
        filename = f"{uuid.uuid4().hex[:12]}{ext}"
        storage_path = os.path.join(subfolder, filename)
        saved_name = default_storage.save(storage_path, media_file)
        media_url = default_storage.url(saved_name)
        if request and not media_url.startswith(('http://', 'https://')):
            media_url = request.build_absolute_uri(media_url)

        thumb_url = media_url if detected_type == 'IMAGE' else (media_url.rsplit('.', 1)[0] + '.jpg')
        return {
            'media_url': media_url,
            'thumbnail_url': thumb_url,
            'cloudinary_public_id': '',
            'media_type': detected_type
        }

    raise ValueError("Neither media_file nor media_url was provided.")
