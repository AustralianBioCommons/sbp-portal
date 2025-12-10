"""Seqera Platform integration helpers."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict

import httpx

from ..schemas.workflows import WorkflowLaunchForm

logger = logging.getLogger(__name__)


class SeqeraConfigurationError(RuntimeError):
    """Raised when required configuration is missing."""


class SeqeraServiceError(RuntimeError):
    """Raised when the Seqera Platform returns an error."""


@dataclass
class SeqeraLaunchResult:
    workflow_id: str
    status: str
    message: str | None = None


def _get_required_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise SeqeraConfigurationError(
            f"Missing required environment variable: {key}"
        )
    return value


async def launch_seqera_workflow(
    form: WorkflowLaunchForm, dataset_id: str | None = None
) -> SeqeraLaunchResult:
    """Launch a workflow on the Seqera Platform."""
    seqera_api_url = _get_required_env("SEQERA_API_URL").rstrip("/")
    seqera_token = _get_required_env("SEQERA_ACCESS_TOKEN")
    workspace_id = _get_required_env("WORK_SPACE")
    compute_env_id = _get_required_env("COMPUTE_ID")
    work_dir = _get_required_env("WORK_DIR")

    launch_payload: Dict[str, Any] = {
        "launch": {
            "computeEnvId": compute_env_id,
            "runName": form.runName or "hello-from-ui",
            "pipeline": form.pipeline or "https://github.com/nextflow-io/hello",
            "workDir": work_dir,
            "workspaceId": workspace_id,
            "revision": form.revision or "main",
            "paramsText": form.paramsText or "",
            "configProfiles": form.configProfiles or [],
            "preRunScript": "module load nextflow",
            "resume": False,
        }
    }

    if dataset_id:
        launch_payload["launch"]["datasetIds"] = [dataset_id]

    url = f"{seqera_api_url}/workflow/launch?workspaceId={workspace_id}"
    logger.info(
        "Launching workflow via Seqera API",
        extra={
            "url": url,
            "workspaceId": workspace_id,
            "computeEnvId": compute_env_id,
            "pipeline": launch_payload["launch"]["pipeline"],
            "runName": launch_payload["launch"]["runName"],
        },
    )

    headers = {
        "Authorization": f"Bearer {seqera_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(60)) as client:
        response = await client.post(url, headers=headers, json=launch_payload)

    if response.is_error:
        body = response.text
        logger.error(
            "Seqera API error",
            extra={
                "status": response.status_code,
                "reason": response.reason_phrase,
                "body": body,
            },
        )
        raise SeqeraServiceError(
            f"Seqera workflow launch failed: {response.status_code} {body}"
        )

    data = response.json()
    workflow_id = data.get("workflowId") or data.get("data", {}).get("workflowId")
    status = data.get("status", "submitted")

    if not workflow_id:
        raise SeqeraServiceError(
            "Seqera workflow launch succeeded but did not return a workflowId"
        )

    return SeqeraLaunchResult(
        workflow_id=workflow_id,
        status=status,
        message=data.get("message"),
    )
