import urllib.request
import urllib.parse
import zipfile
import os
from bs4 import BeautifulSoup

def main():
    url = "https://drive.google.com/uc?export=download&id=1MfD47XvVdRKBGRAyzGOxDCEf2ve96Jjo"
    zip_path = "challenge.zip"
    extract_dir = r"d:\CIDE\extracted_challenge\India_runs_data_and_ai_challenge"

    print(f"Loading warning page from {url}...")
    try:
        # We need a user agent so Google doesn't block us or give us a different page
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error loading warning page: {e}")
        return

    # Parse HTML to find the download form
    soup = BeautifulSoup(html, 'html.parser')
    form = soup.find('form', id='download-form') or soup.find('form')
    if not form:
        print("Download form not found on page. Page content preview:")
        print(html[:1000])
        return

    action = form.get('action')
    if not action.startswith('http'):
        action = urllib.parse.urljoin("https://drive.google.com", action)

    # Extract all inputs
    inputs = {}
    for inp in form.find_all('input'):
        name = inp.get('name')
        value = inp.get('value')
        if name:
            inputs[name] = value

    # Add confirm=t if not present
    inputs['confirm'] = 't'

    # Build download URL
    query_string = urllib.parse.urlencode(inputs)
    download_url = f"{action}?{query_string}"
    print(f"Constructed download URL: {download_url}")

    print("Downloading ZIP file...")
    try:
        # Request ZIP with User-Agent
        req_dl = urllib.request.Request(
            download_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req_dl) as response:
            with open(zip_path, 'wb') as f:
                f.write(response.read())
        print("Download completed successfully.")
    except Exception as e:
        print(f"Error downloading ZIP: {e}")
        return

    # Extract Zip
    print(f"Extracting to {extract_dir}...")
    try:
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for file_info in zip_ref.infolist():
                name = file_info.filename
                clean_name = os.path.basename(name)
                if file_info.is_dir() or not clean_name:
                    continue
                
                if "dossier_templates" in name or "templates" in name:
                    target_dir = os.path.join(extract_dir, "dossier_templates")
                else:
                    target_dir = extract_dir
                
                os.makedirs(target_dir, exist_ok=True)
                target_path = os.path.join(target_dir, clean_name)
                print(f"Extracting {name} -> {target_path}")
                content = zip_ref.read(name)
                with open(target_path, 'wb') as f:
                    f.write(content)
        print("Extraction completed successfully.")
    except Exception as e:
        print(f"Error extracting ZIP: {e}")

if __name__ == '__main__':
    main()
