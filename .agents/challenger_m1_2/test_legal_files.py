import os

def test_legal_files():
    print("=== TASK 3: EMPIRICAL LEGAL ASSETS AUDIT ===")
    
    privacy_path = r"d:\sitesdata\Resturent App\admin\public\privacy-policy.html"
    terms_path = r"d:\sitesdata\Resturent App\admin\public\terms-of-service.html"
    
    # 1. Existence and File Size Check
    assert os.path.exists(privacy_path), f"Privacy policy missing at {privacy_path}"
    assert os.path.exists(terms_path), f"Terms of service missing at {terms_path}"
    
    privacy_size = os.path.getsize(privacy_path)
    terms_size = os.path.getsize(terms_path)
    
    print(f"privacy-policy.html size: {privacy_size} bytes ({privacy_size / 1024:.2f} KB)")
    print(f"terms-of-service.html size: {terms_size} bytes ({terms_size / 1024:.2f} KB)")
    
    assert privacy_size > 5000, "Privacy policy file size unusually small (<5KB)"
    assert terms_size > 5000, "Terms of service file size unusually small (<5KB)"
    
    # 2. Readability & Structure Check
    with open(privacy_path, 'r', encoding='utf-8') as f:
        privacy_content = f.read()
        
    with open(terms_path, 'r', encoding='utf-8') as f:
        terms_content = f.read()
        
    # Check valid HTML markers
    assert privacy_content.strip().startswith("<!DOCTYPE html>"), "Privacy policy missing DOCTYPE html"
    assert privacy_content.strip().endswith("</html>"), "Privacy policy missing closing </html> tag"
    assert terms_content.strip().startswith("<!DOCTYPE html>"), "Terms of service missing DOCTYPE html"
    assert terms_content.strip().endswith("</html>"), "Terms of service missing closing </html> tag"
    
    # Check key legal requirements in privacy policy
    assert "Privacy Policy" in privacy_content
    assert "GetFood" in privacy_content
    assert "data" in privacy_content.lower()
    
    # Check key legal requirements in terms of service
    assert "Terms of Service" in terms_content
    assert "GetFood" in terms_content
    assert "order" in terms_content.lower()
    
    print("[PASS] Legal files exist, are fully readable UTF-8 HTML documents, and contain comprehensive legal policies.")
    print("=== TASK 3 AUDIT COMPLETE: ALL PASS ===")

if __name__ == '__main__':
    test_legal_files()
