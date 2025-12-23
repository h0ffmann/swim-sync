import csv
import io
from datetime import datetime
from typing import List, Optional
from .schemas import ActivityCreate


def time_to_seconds(time_str: str) -> int:
    """Convert time string (HH:MM:SS) to seconds."""
    try:
        parts = time_str.split(":")
        if len(parts) == 3:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = int(parts[2].split(".")[0])  # Handle decimal seconds
            return hours * 3600 + minutes * 60 + seconds
    except (ValueError, IndexError):
        pass
    return 0


def parse_distance(dist_str: str) -> int:
    """Parse distance string with commas to integer meters."""
    try:
        return round(float(dist_str.replace(",", "")))
    except ValueError:
        return 0


def parse_pace(pace_str: str) -> Optional[float]:
    """Parse pace string (M:SS) to seconds per 100m."""
    if not pace_str or pace_str == "--":
        return None
    try:
        parts = pace_str.split(":")
        if len(parts) == 2:
            minutes = int(parts[0])
            seconds = int(parts[1])
            return float(minutes * 60 + seconds)
    except (ValueError, IndexError):
        pass
    return None


def parse_heart_rate(hr_str: str) -> Optional[int]:
    """Parse heart rate string to integer."""
    if not hr_str or hr_str == "--":
        return None
    try:
        return int(hr_str)
    except ValueError:
        return None


def parse_garmin_csv(csv_content: str, user_id: str) -> List[ActivityCreate]:
    """Parse Garmin CSV export and return list of activities."""
    activities = []
    
    reader = csv.DictReader(io.StringIO(csv_content))
    
    for row in reader:
        activity_type = row.get("Activity Type", "")
        is_open_water = "Open Water" in activity_type
        is_pool = "Pool" in activity_type
        
        if not is_open_water and not is_pool:
            continue
        
        # Parse date
        date_str = row.get("Date", "")
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
        
        # Parse duration
        time_str = row.get("Time", "")
        duration = time_to_seconds(time_str)
        if duration == 0:
            continue
        
        # Parse distance
        distance_str = row.get("Distance", "")
        distance = parse_distance(distance_str)
        if distance == 0:
            continue
        
        # Create activity
        activity = ActivityCreate(
            type="open_water" if is_open_water else "pool",
            date=date,
            duration=duration,
            distance=distance,
            stroke="freestyle",  # Default, Garmin doesn't always specify
            pool_length=50 if is_pool else None,
            pace=parse_pace(row.get("Avg Pace", "")),
            heart_rate_avg=parse_heart_rate(row.get("Avg HR", "")),
            notes=f"Imported: {row.get('Title', 'Garmin Activity')}",
        )
        activities.append(activity)
    
    return activities
