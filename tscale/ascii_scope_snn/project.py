"""
Project manager for ASCII Scope SNN.

Manages project structure:
  project-dir/
    .snn/          # Local metadata (like .git/)
      config       # Local config
      cwd          # Current working directory
      session      # Last session timestamp
    db/            # TRS data storage
    audio/         # User's audio files
"""

import os
import json
from pathlib import Path
from typing import Optional
from .trs import TRSStorage
from .cwd_manager import CWDManager


class SNNProject:
    """
    Manages SNN project structure and metadata.

    Uses two directories:
    - `.snn/` - Local metadata (config, session info, cache)
    - `db/` - TRS data storage (timestamped records)
    """

    def __init__(self, project_dir: Optional[Path] = None):
        """
        Initialize or discover SNN project.

        Args:
            project_dir: Project root directory (default: search upward from cwd)
        """
        if project_dir:
            self.project_dir = Path(project_dir).resolve()
        else:
            self.project_dir = self._find_or_create_project()

        # Initialize directories
        self.snn_dir = self.project_dir / ".snn"
        self.db_dir = self.project_dir / "db"

        self.snn_dir.mkdir(parents=True, exist_ok=True)
        self.db_dir.mkdir(parents=True, exist_ok=True)

        # Initialize TRS storage
        self.trs = TRSStorage(str(self.db_dir))

        # Initialize CWD manager
        self.cwd_mgr = CWDManager(self.trs)

    def _find_or_create_project(self) -> Path:
        """
        Find existing .snn directory by searching upward, or create in cwd.

        Returns:
            Project root directory
        """
        # Start from current directory
        current = Path.cwd()

        # Search upward for .snn directory (like .git)
        while current != current.parent:
            snn_dir = current / ".snn"
            if snn_dir.exists() and snn_dir.is_dir():
                return current
            current = current.parent

        # Not found, create in current directory
        return Path.cwd()

    def get_session_file(self) -> Path:
        """Get path to session state file."""
        return self.snn_dir / "session.json"

    def get_config_file(self) -> Path:
        """Get path to local config file."""
        return self.snn_dir / "config.json"

    def save_session_state(self, state_data: dict):
        """
        Save session state to .snn/session.json.

        Args:
            state_data: Session state dictionary
        """
        session_file = self.get_session_file()
        with open(session_file, 'w') as f:
            json.dump(state_data, f, indent=2)

    def load_session_state(self) -> Optional[dict]:
        """
        Load session state from .snn/session.json.

        Returns:
            Session state dict or None if not found
        """
        session_file = self.get_session_file()
        if not session_file.exists():
            # Try legacy filename without extension
            legacy_file = self.snn_dir / "session"
            if legacy_file.exists():
                with open(legacy_file, 'r') as f:
                    data = json.load(f)
                # Migrate to new filename
                with open(session_file, 'w') as f:
                    json.dump(data, f, indent=2)
                legacy_file.unlink()  # Remove old file
                return data
            return None

        with open(session_file, 'r') as f:
            return json.load(f)

    def save_local_config(self, config_data: dict):
        """
        Save local config to .snn/config.json.

        Args:
            config_data: Configuration dictionary
        """
        config_file = self.get_config_file()
        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)

    def load_local_config(self) -> Optional[dict]:
        """
        Load local config from .snn/config.json.

        Returns:
            Config dict or None if not found
        """
        config_file = self.get_config_file()
        if not config_file.exists():
            # Return default config with press duration thresholds
            return {
                'quick_press_threshold_ms': 200,
                'medium_press_threshold_ms': 500,
                'long_press_threshold_ms': 1000,
            }

        with open(config_file, 'r') as f:
            return json.load(f)

    def get_config_value(self, key: str, default=None):
        """Get a config value with fallback to default."""
        config = self.load_local_config()
        if config:
            return config.get(key, default)
        return default

    def get_cache_dir(self) -> Path:
        """Get cache directory (.snn/cache/)."""
        cache_dir = self.snn_dir / "cache"
        cache_dir.mkdir(exist_ok=True)
        return cache_dir

    def get_info(self) -> dict:
        """
        Get project information.

        Returns:
            Dictionary with project metadata
        """
        # Count records by type
        data_count = len(self.trs.query(type="data"))
        config_count = len(self.trs.query(type="config"))
        session_count = len(self.trs.query(type="session"))
        log_count = len(self.trs.query(type="log"))
        audio_count = len(self.trs.query(type="audio"))

        # Get DB size
        db_size = self.trs.get_db_size()

        # Get latest records
        latest_data = self.trs.query_latest(type="data")
        latest_session = self.load_session_state()

        return {
            "project_dir": str(self.project_dir),
            "snn_dir": str(self.snn_dir),
            "db_dir": str(self.db_dir),
            "cwd": str(self.cwd_mgr.get_cwd()),
            "db_size_bytes": db_size,
            "db_size_mb": round(db_size / (1024 * 1024), 2),
            "record_counts": {
                "data": data_count,
                "config": config_count,
                "session": session_count,
                "log": log_count,
                "audio": audio_count,
            },
            "latest_data_timestamp": latest_data.timestamp if latest_data else None,
            "has_local_config": self.get_config_file().exists(),
            "has_session": self.get_session_file().exists(),
        }

    def __str__(self) -> str:
        """String representation of project."""
        info = self.get_info()
        return (f"SNN Project\n"
                f"  Directory: {info['project_dir']}\n"
                f"  CWD: {info['cwd']}\n"
                f"  DB Size: {info['db_size_mb']} MB\n"
                f"  Records: {sum(info['record_counts'].values())} total")
