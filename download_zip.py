import urllib.request
import zipfile
import os

def main():
    url = "https://drive.google.com/uc?export=download&id=1MfD47XvVdRKBGRAyzGOxDCEf2ve96Jjo"
    zip_path = "challenge.zip"
    extract_dir = r"d:\CIDE\extracted_challenge\India_runs_data_and_ai_challenge"

    print(f"Downloading from {url} to {zip_path}...")
    try:
        urllib.request.urlretrieve(url, zip_path)
        print("Download completed successfully.")
    except Exception as e:
        print(f"Error during download: {e}")
        return

    print(f"Extracting {zip_path} to {extract_dir}...")
    try:
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for file_info in zip_ref.infolist():
                # Extract file
                name = file_info.filename
                # Clean name if it has paths
                clean_name = os.path.basename(name)
                if file_info.is_dir() or not clean_name:
                    continue
                
                # If the file is inside dossier_templates
                if "dossier_templates" in name:
                    target_dir = os.path.join(extract_dir, "dossier_templates")
                else:
                    target_dir = extract_dir
                
                os.makedirs(target_dir, exist_ok=True)
                target_path = os.path.join(target_dir, clean_name)
                
                print(f"Extracting entry {name} -> {target_path}")
                content = zip_ref.read(name)
                with open(target_path, 'wb') as f:
                    f.write(content)
        print("Extraction completed successfully.")
    except Exception as e:
        print(f"Error during extraction: {e}")

if __name__ == '__main__':
    main()
