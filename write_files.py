import os, shutil

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = script_dir  # skript je v rootu projektu

files = {
    "Header_final.tsx": os.path.join("app", "components", "Header.tsx"),
    "page_final.tsx": os.path.join("app", "page.tsx"),
    "billing_final.tsx": os.path.join("app", "billing", "page.tsx"),
}

for src, dst in files.items():
    src_path = os.path.join(script_dir, src)
    dst_path = os.path.join(project_dir, dst)
    if os.path.exists(src_path):
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        shutil.copy2(src_path, dst_path)
        print(f"OK: {dst}")
    else:
        print(f"CHYBA: {src} nenalezen")

print("Hotovo!")
