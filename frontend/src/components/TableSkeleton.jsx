import { memo } from "react";
import { Skeleton, Stack } from "@mui/material";

function TableSkeleton({ rows = 5, height = 48 }) {
  return (
    <Stack spacing={1} sx={{ p: 3 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={height} />
      ))}
    </Stack>
  );
}

export default memo(TableSkeleton);
