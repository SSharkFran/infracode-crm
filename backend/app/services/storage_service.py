import re
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import storage_manager
from app.models.models import Attachment
from app.schemas.schemas import AttachmentRead


_slug_pattern = re.compile(r"[^a-zA-Z0-9._-]+")


def _sanitize_filename(filename: str) -> str:
    base = Path(filename).name or "arquivo"
    return _slug_pattern.sub("_", base)


def build_storage_key(entity_type: str, entity_id: UUID, filename: str) -> str:
    safe_name = _sanitize_filename(filename)
    return f"{entity_type}/{entity_id}/{uuid.uuid4()}-{safe_name}"


async def upload_attachment(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    file: UploadFile,
) -> Attachment:
    file_bytes = await file.read()
    storage_key = build_storage_key(entity_type, entity_id, file.filename or "arquivo")
    await run_in_threadpool(
        storage_manager.upload_file,
        storage_key,
        file_bytes,
        file.content_type or "application/octet-stream",
    )

    attachment = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        filename=file.filename or "arquivo",
        storage_key=storage_key,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


async def list_attachments(db: AsyncSession, entity_type: str, entity_id: UUID) -> list[Attachment]:
    result = await db.execute(
        select(Attachment)
        .where(Attachment.entity_type == entity_type, Attachment.entity_id == entity_id)
        .order_by(Attachment.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def serialize_attachment(attachment: Attachment) -> AttachmentRead:
    url = await run_in_threadpool(storage_manager.get_presigned_url, attachment.storage_key)
    return AttachmentRead.model_validate(attachment).model_copy(update={"download_url": url})


async def serialize_attachments(attachments: list[Attachment]) -> list[AttachmentRead]:
    return [await serialize_attachment(item) for item in attachments]
