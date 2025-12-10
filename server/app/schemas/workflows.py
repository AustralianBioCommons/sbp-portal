"""Pydantic models shared across workflow endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkflowLaunchForm(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pipeline: str = Field(..., description="Workflow pipeline repository or URL")
    revision: Optional[str] = Field(
        default=None, description="Revision or branch of the pipeline to run"
    )
    configProfiles: List[str] = Field(
        default_factory=list, description="Profiles that customize the workflow"
    )
    runName: Optional[str] = Field(
        default=None, description="Human-readable workflow run name"
    )
    paramsText: Optional[str] = Field(
        default=None, description="YAML-style parameter overrides"
    )

    @field_validator("pipeline")
    @classmethod
    def validate_pipeline(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("pipeline is required")
        return value.strip()


class WorkflowLaunchPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    launch: WorkflowLaunchForm
    datasetId: Optional[str] = Field(
        default=None,
        description="Optional Seqera dataset ID to attach to the workflow",
    )


class WorkflowLaunchResponse(BaseModel):
    message: str
    runId: str
    status: str
    submitTime: datetime
