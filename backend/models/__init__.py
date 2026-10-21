# models/__init__.py
# Import every model here so db.create_all() registers its table.

from models.user import User  # noqa: F401
from models.task import Task, TaskPriority, TaskStatus  # noqa: F401
