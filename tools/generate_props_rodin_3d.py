import os
import json
import time
import subprocess
from PIL import Image

PROPS = ['car_zhiguli', 'car_uaz', 'trash_dumpster', 'military_crate']

# Existing task for car_zhiguli already submitted
EXISTING_TASKS = {
    'car_zhiguli': {
        "uuid": "0a68d91f-954c-484b-a3e2-07ca8a035057",
        "subscription_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoxLCJqb2JJZHMiOlsiZGQwNjM2YjgtYWJlNy00MGU1LTllYjUtN2FhOTdmYzFmZDg1IiwiNDZlOTE3ZTEtYmZiYS00NjhkLWE0OGUtOGIyYzk3N2M1ZGE4IiwiYWM5MGUyMTEtNjNkOS00ZDM2LWFkMjEtMWVlMDc1OTRmZjVlIiwiNTZhNzgwMzItOGIzZS00YzM2LThkYjMtNmUyZTZjY2M0NmNmIiwiNWRiNmY3ZjEtZWI3ZS00YWUxLThmNWItYzNhYzIzZDRmNmI0IiwiZDhkMWIxY2UtMWQ3OS00YTViLTk3YTEtMTJkYjdjZDFiMGFiIl0sImlhdCI6MTc5MTc4NDEzNX0.XibC2WmC3zTpGTP0BpulCu-wPJDLD-XbSUILJGNWpNE"
    }
}

def prepare_14k_webp(prop_id):
    clean_path = f"blender_assets/props_concepts/{prop_id}_clean.png"
    webp_path = f"blender_assets/props_concepts/{prop_id}_14k.webp"
    im = Image.open(clean_path).convert("RGBA")

    # Put on clean white background or keep RGBA, tune size/quality so file is < 14200 bytes
    for max_dim in [448, 384, 340, 300]:
        for q in [80, 72, 65, 55]:
            copy_im = im.copy()
            copy_im.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            copy_im.save(webp_path, "WEBP", quality=q)
            sz = os.path.getsize(webp_path)
            if sz < 14200:
                print(f"[{prop_id}] Prepared {webp_path}: {copy_im.size} ({sz} bytes, q={q})")
                return webp_path
    return webp_path

def submit_rodin_job(prop_id):
    task_file = f"blender_assets/props_concepts/{prop_id}_task.json"
    if prop_id in EXISTING_TASKS:
        with open(task_file, "w", encoding="utf-8") as f:
            json.dump(EXISTING_TASKS[prop_id], f)
        return EXISTING_TASKS[prop_id]

    if os.path.exists(task_file):
        with open(task_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "uuid" in data:
                return data

    webp_path = prepare_14k_webp(prop_id)
    cmd = [
        "curl.exe", "-s", "-X", "POST",
        "https://hyperhuman.deemos.com/api/v2/rodin",
        "-H", "Authorization: Bearer vibecoding",
        "-F", f"images=@{webp_path}",
        "-F", "tier=Sketch",
        "-F", "mesh_mode=Raw",
        "-F", "texture_mode=high",
        "-F", "prompt= "
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    if "uuid" not in data:
        raise RuntimeError(f"Failed to submit {prop_id}: {res.stdout}")

    task_info = {
        "uuid": data["uuid"],
        "subscription_key": data["jobs"]["subscription_key"]
    }
    with open(task_file, "w", encoding="utf-8") as f:
        json.dump(task_info, f)
    print(f"[{prop_id}] Submitted to Hyper3D Rodin! uuid={task_info['uuid']}")
    return task_info

def check_status(sub_key):
    payload = json.dumps({"subscription_key": sub_key})
    cmd = [
        "curl.exe", "-s", "-X", "POST",
        "https://hyperhuman.deemos.com/api/v2/status",
        "-H", "Authorization: Bearer vibecoding",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if not res.stdout.strip():
        return ["Waiting"]
    data = json.loads(res.stdout)
    return [j["status"] for j in data.get("jobs", [])]

def download_glb(prop_id, task_uuid):
    payload = json.dumps({"task_uuid": task_uuid})
    cmd = [
        "curl.exe", "-s", "-X", "POST",
        "https://hyperhuman.deemos.com/api/v2/download",
        "-H", "Authorization: Bearer vibecoding",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    glb_url = None
    for item in data.get("list", []):
        if item["name"].endswith(".glb"):
            glb_url = item["url"]
            break

    if not glb_url:
        raise RuntimeError(f"No .glb found in download list for {prop_id}: {data}")

    out_glb = f"assets/models/{prop_id}.glb"
    print(f"[{prop_id}] Downloading GLB from {glb_url[:80]}...")
    # Try direct curl download first, with retry/resume support
    dl_cmd = ["curl.exe", "-L", "-s", "--retry", "5", "-o", out_glb, glb_url]
    subprocess.run(dl_cmd, check=True)
    sz = os.path.getsize(out_glb)
    print(f"[{prop_id}] Saved 3D model {out_glb} ({sz:,} bytes)!")
    return out_glb

if __name__ == "__main__":
    tasks = {}
    for pid in PROPS:
        tasks[pid] = submit_rodin_job(pid)

    pending = set(PROPS)
    while pending:
        for pid in list(pending):
            statuses = check_status(tasks[pid]["subscription_key"])
            print(f"[{pid}] Statuses: {statuses}")
            if statuses and all(s == "Done" for s in statuses):
                download_glb(pid, tasks[pid]["uuid"])
                pending.remove(pid)
            elif any(s in ("Failed", "Canceled") for s in statuses):
                raise RuntimeError(f"Rodin job failed for {pid}: {statuses}")
        if pending:
            time.sleep(8)

    print("ALL 4 REAL 3D GLB MODELS GENERATED AND DOWNLOADED FROM HYPER3D RODIN!")
