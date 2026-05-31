import cloudinary
import cloudinary.uploader
import cloudinary.api

# 1. Configure Cloudinary inline
cloudinary.config(
    cloud_name="depa8gfnk",
    api_key="662593181225615",
    api_secret="zLCgiUu3bUrkwrMUOxlc2AOz0Vg",
    secure=True
)

def run_onboarding():
    print("--- 1. Cloudinary Configured ---")
    
    # 2. Upload an image from Cloudinary's demo domain
    sample_image_url = "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    print(f"Uploading sample image: {sample_image_url}")
    upload_result = cloudinary.uploader.upload(sample_image_url)
    
    secure_url = upload_result.get("secure_url")
    public_id = upload_result.get("public_id")
    print(f"Uploaded Secure URL: {secure_url}")
    print(f"Uploaded Public ID: {public_id}")
    
    print("\n--- 2. Fetching Image Details ---")
    # 3. Get image details
    details = cloudinary.api.resource(public_id)
    width = details.get("width")
    height = details.get("height")
    format_type = details.get("format")
    bytes_size = details.get("bytes")
    
    print(f"Width: {width}px")
    print(f"Height: {height}px")
    print(f"Format: {format_type}")
    print(f"File Size: {bytes_size} bytes")
    
    print("\n--- 3. Transforming Image ---")
    # 4. Transform the image
    # f_auto (Fetch Format Auto) tells Cloudinary to automatically choose the best image format 
    # (e.g. WebP, AVIF) based on the requesting browser.
    # q_auto (Quality Auto) optimizes the visual quality of the image while minimizing file size.
    transformed_url = cloudinary.utils.cloudinary_url(
        public_id,
        fetch_format="auto",
        quality="auto",
        secure=True
    )[0]
    
    print("Done! Click link below to see optimized version of the image. Check the size and the format.")
    print(transformed_url)

if __name__ == "__main__":
    run_onboarding()
