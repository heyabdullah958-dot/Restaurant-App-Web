import fetch, { FormData, File } from 'node-fetch';

async function testUpload() {
  const formData = new FormData();
  formData.append('name', 'Test Upload Item');
  formData.append('price', '100');
  formData.append('description', 'Test');
  formData.append('preparation_time', '15');
  formData.append('is_available', 'true');
  formData.append('options', JSON.stringify({ has_variants: false, specifications: {}, variants: [] }));
  // formData.append('category', '1');
  
  // Note: Since we are not logged in, we expect a 401 Unauthorized. 
  // If we get 401, CORS is working fine! If we get network error/failed fetch, CORS is broken.

  console.log("Sending request...");
  try {
    const res = await fetch('https://restaurant-app-web.onrender.com/api/admin/menu-items/', {
      method: 'POST',
      headers: {
        'Origin': 'https://foodsphere-admin.pages.dev',
        'X-HTTP-Method-Override': 'PATCH'
      },
      body: formData
    });
    
    console.log("Status:", res.status);
    console.log("Headers:", res.headers.raw());
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testUpload();
