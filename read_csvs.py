import os
import glob
import csv
import json

def find_csvs():
    files = glob.glob(r"D:\**\*.csv", recursive=True)
    return files

def main():
    csv_files = find_csvs()
    data = {}
    for path in csv_files:
        name = os.path.basename(path)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                rows = list(reader)
                data[name] = rows
        except Exception as e:
            pass
            
    templates = glob.glob(r"D:\**\*template.md", recursive=True)
    if templates:
        try:
            with open(templates[0], 'r', encoding='utf-8') as f:
                data["template.md"] = f.read()
        except Exception as e:
            pass
            
    print("===START_JSON===")
    print(json.dumps(data, indent=2))
    print("===END_JSON===")

if __name__ == '__main__':
    main()
