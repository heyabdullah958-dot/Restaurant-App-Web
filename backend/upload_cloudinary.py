import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
import cloudinary.uploader

media_dir = 'd:/sitesdata/Resturent App/backend/media/menu_items'
for filename in os.listdir(media_dir):
    if filename.endswith('.jpg') or filename.endswith('.png'):
        file_path = os.path.join(media_dir, filename)
        public_id = f'menu_items/{os.path.splitext(filename)[0]}'
        try:
            print(f'Uploading {filename} to {public_id}...')
            cloudinary.uploader.upload(file_path, public_id=public_id, unique_filename=False, overwrite=True)
            print(f'Success: {filename}')
        except Exception as e:
            print(f'Error uploading {filename}: {e}')
