import os
import glob
import zipfile
import json

def find_zip():
    downloads_dir = r"C:\Users\maruthi Prasad\Downloads"
    patterns = [
        os.path.join(downloads_dir, "*India_runs_data_and_ai_challenge*.zip"),
        r"C:\Users\maruthi Prasad\**\*India_runs_data_and_ai_challenge*.zip"
    ]
    
    for pattern in patterns:
        files = glob.glob(pattern, recursive=True)
        if files:
            return files[0]
    return None

def main():
    zip_path = find_zip()
    print("Found zip at:", zip_path)
    if not zip_path:
        print("Zip file not found.")
        return
        
    data = {}
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        for file_info in zip_ref.infolist():
            if file_info.is_dir():
                continue
            name = file_info.filename
            print("Reading entry:", name)
            content = zip_ref.read(name).decode('utf-8', errors='ignore')
            data[name] = content
            
    out_path = "challenge_data.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Successfully saved to:", os.path.abspath(out_path))
    print("Exists right after save:", os.path.exists(out_path))

if __name__ == '__main__':
    main()
