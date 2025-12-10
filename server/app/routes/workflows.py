"""Workflow-related HTTP routes."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from ..schemas.workflows import (
    WorkflowLaunchPayload,
    WorkflowLaunchResponse,
)
from ..services.seqera import (
    SeqeraConfigurationError,
    SeqeraLaunchResult,
    SeqeraServiceError,
    launch_seqera_workflow,
)

router = APIRouter(tags=["workflows"])


@router.post("/launch", response_model=WorkflowLaunchResponse, status_code=status.HTTP_201_CREATED)
async def launch_workflow(payload: WorkflowLaunchPayload) -> WorkflowLaunchResponse:
    """Launch a workflow on the Seqera Platform."""
    try:
        result: SeqeraLaunchResult = await launch_seqera_workflow(
            payload.launch, payload.datasetId
        )
    except SeqeraConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    except SeqeraServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return WorkflowLaunchResponse(
        message="Workflow launched successfully",
        runId=result.workflow_id,
        status=result.status,
        submitTime=datetime.now(timezone.utc),
    )
