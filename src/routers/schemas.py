from pydantic import BaseModel
from typing import Optional


class UsersBase(BaseModel):
    name: str
    description: Optional[str] = None


class UsersCreate(UsersBase):
    pass


class UsersUpdate(UsersBase):
    pass


class UsersInDB(UsersBase):
    id: int


class UsersResponse(UsersInDB):
    class Config:
        from_attributes = True
