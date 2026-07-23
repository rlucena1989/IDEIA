from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/userss", tags=["userss"])


class UsersCreate(BaseModel):
    name: str


class UsersResponse(BaseModel):
    id: int
    name: str


_items: List[dict] = []
_counter: int = 0


@router.post("/", response_model=UsersResponse)
def create(item: UsersCreate):
    global _counter
    _counter += 1
    entry = {"id": _counter, "name": item.name}
    _items.append(entry)
    return entry


@router.get("/", response_model=List[UsersResponse])
def list_all():
    return _items


@router.get("/{item_id}", response_model=UsersResponse)
def get_one(item_id: int):
    for item in _items:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")
