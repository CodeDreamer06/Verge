from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ViewScore:
    label: str
    congestion_score: float


def allocate_green_times(
    view_scores: list[ViewScore],
    cycle_time: int,
    min_green: int,
    max_green: int,
) -> dict[str, int]:
    if not view_scores:
        return {}
    if len(view_scores) == 1:
        return {view_scores[0].label: cycle_time}

    total_score = sum(max(score.congestion_score, 0.0) for score in view_scores)
    if total_score <= 0:
        even_split = max(min_green, min(max_green, cycle_time // len(view_scores)))
        return {score.label: even_split for score in view_scores}

    allocations: dict[str, int] = {}
    remaining_cycle = cycle_time
    for score in view_scores:
        proportional = round((score.congestion_score / total_score) * cycle_time)
        bounded = max(min_green, min(max_green, proportional))
        allocations[score.label] = bounded
        remaining_cycle -= bounded

    if remaining_cycle == 0:
        return allocations

    labels = [score.label for score in sorted(view_scores, key=lambda item: item.congestion_score, reverse=True)]
    index = 0
    step = 1 if remaining_cycle > 0 else -1

    while remaining_cycle != 0 and labels:
        label = labels[index % len(labels)]
        proposed = allocations[label] + step
        if min_green <= proposed <= max_green:
            allocations[label] = proposed
            remaining_cycle -= step
        index += 1
        if index > len(labels) * max(cycle_time, 1) * 2:
            break

    return allocations


def apply_priority_override(
    view_scores: list[ViewScore],
    allocations: dict[str, int],
    cycle_time: int,
    min_green: int,
    max_green: int,
    priority_label: str | None = None,
) -> dict[str, int]:
    if not priority_label or priority_label not in allocations:
        return allocations
    if len(view_scores) <= 1:
        return allocations

    reserved_minimum = min_green * (len(view_scores) - 1)
    priority_green = min(max_green, cycle_time - reserved_minimum)
    if priority_green <= 0:
        return allocations

    remaining_scores = [score for score in view_scores if score.label != priority_label]
    remaining_cycle = cycle_time - priority_green
    remaining_allocations = allocate_green_times(
        view_scores=remaining_scores,
        cycle_time=remaining_cycle,
        min_green=min_green,
        max_green=max_green,
    )
    return {priority_label: priority_green, **remaining_allocations}
