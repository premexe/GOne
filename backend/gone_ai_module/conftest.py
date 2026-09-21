"""
Ensures the project root is on sys.path so `import src....` works when
running pytest from the project root, without requiring the package to
be pip-installed.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
