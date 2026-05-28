from __future__ import annotations

import atexit
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / "artifacts" / "logs"
PYTHON = ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
MASTER_LOG = LOG_DIR / "paper-retrain-master.log"
STATUS_FILE = LOG_DIR / "paper-retrain-status.txt"
LOCK_FILE = LOG_DIR / "paper-retrain.lock"

RUNS = [
    ("cnn", LOG_DIR / "paper-cnn-retrain.log"),
    ("resnet50", LOG_DIR / "paper-resnet50-retrain.log"),
    ("vgg16", LOG_DIR / "paper-vgg16-retrain.log"),
    ("inception_v3", LOG_DIR / "paper-inception_v3-retrain.log"),
]


def write_master(line: str) -> None:
    with MASTER_LOG.open("a", encoding="utf-8") as handle:
        handle.write(line.rstrip("\n") + "\n")
    print(line.rstrip("\n"), flush=True)


def set_status(text: str) -> None:
    STATUS_FILE.write_text(text + "\n", encoding="utf-8")


def cleanup_lock() -> None:
    if LOCK_FILE.exists():
        try:
            if LOCK_FILE.read_text(encoding="utf-8").strip() == str(os.getpid()):
                LOCK_FILE.unlink()
        except OSError:
            pass


def acquire_lock() -> None:
    if LOCK_FILE.exists():
        existing = LOCK_FILE.read_text(encoding="utf-8").strip()
        raise RuntimeError(f"Paper retraining is already running under PID {existing}.")
    LOCK_FILE.write_text(str(os.getpid()), encoding="utf-8")
    atexit.register(cleanup_lock)


def main() -> int:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    acquire_lock()

    MASTER_LOG.write_text("", encoding="utf-8")
    set_status("starting")

    write_master(f"=== Paper retraining started at {datetime.now().isoformat()} ===")

    for model_name, model_log in RUNS:
        model_log.write_text("", encoding="utf-8")
        set_status(f"running:{model_name}")
        write_master(f"\n=== Starting {model_name} at {datetime.now().isoformat()} ===")

        args = [
            str(PYTHON),
            str(ROOT / "scripts" / "train_paper_models.py"),
            "--model",
            model_name,
            "--cpu-only",
            "--export-onnx",
            "--match-paper-counts",
        ]

        process = subprocess.Popen(
            args,
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )

        assert process.stdout is not None
        with model_log.open("a", encoding="utf-8") as model_handle:
            for line in process.stdout:
                model_handle.write(line)
                model_handle.flush()
                write_master(f"[{model_name}] {line.rstrip()}")

        exit_code = process.wait()
        if exit_code != 0:
            set_status(f"failed:{model_name}")
            write_master(f"=== {model_name} failed with exit code {exit_code} at {datetime.now().isoformat()} ===")
            return exit_code

        set_status(f"completed:{model_name}")
        write_master(f"=== Completed {model_name} at {datetime.now().isoformat()} ===")

    set_status("completed:all")
    write_master(f"=== Paper retraining complete at {datetime.now().isoformat()} ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
