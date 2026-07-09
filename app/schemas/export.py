from pydantic import BaseModel


class ExportResponse(BaseModel):
    message: str
    file_name: str | None = None
    file_url: str | None = None
