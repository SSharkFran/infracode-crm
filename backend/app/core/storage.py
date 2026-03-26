from botocore.client import Config
from botocore.exceptions import ClientError
import boto3

from app.core.config import settings


class StorageManager:
    def __init__(self) -> None:
        self.client = None

    def is_configured(self) -> bool:
        return settings.storage_enabled

    def get_client(self):
        if not self.is_configured():
            raise RuntimeError("Storage nao configurado.")

        if self.client is None:
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.minio_endpoint_url,
                aws_access_key_id=settings.minio_access_key,
                aws_secret_access_key=settings.minio_secret_key,
                region_name="us-east-1",
                config=Config(signature_version="s3v4"),
            )

        return self.client

    def ensure_bucket(self) -> None:
        if not self.is_configured():
            return

        client = self.get_client()
        try:
            client.head_bucket(Bucket=settings.minio_bucket)
        except ClientError:
            client.create_bucket(Bucket=settings.minio_bucket)

    def upload_file(self, key: str, file_bytes: bytes, content_type: str) -> None:
        self.ensure_bucket()
        self.get_client().put_object(
            Bucket=settings.minio_bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )

    def get_presigned_url(self, key: str, expires: int = 3600) -> str:
        return self.get_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.minio_bucket, "Key": key},
            ExpiresIn=expires,
        )

    def delete_file(self, key: str) -> None:
        self.get_client().delete_object(Bucket=settings.minio_bucket, Key=key)


storage_manager = StorageManager()
