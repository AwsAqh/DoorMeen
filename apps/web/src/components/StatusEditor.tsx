// StatusEditor.tsx
import * as React from "react";
import { Chip, Menu, MenuItem, Stack } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import type { Status } from "../components/Helpers/status";
import { STATUS_LABEL } from "../components/Helpers/status";

export function StatusEditor({
  value,
  onSave,
  inline = true,
}: {
  value: Status;
  onSave: (nextStatus:Status) => void| Promise<void>;
  inline?: boolean;
}) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [draft, setDraft] = React.useState<Status>(value);
  const open = Boolean(anchorEl);
  const dirty = draft !== value;

  const choose = (s: Status) => {
    setDraft(s);
    setAnchorEl(null);
  };

  return (
    <Stack direction={inline ? "row" : "column"} spacing={1} alignItems="center">
      <Chip
        label={STATUS_LABEL[draft]}
        color={draft === "served" ? "success" : draft === "in_progress" ? "warning" : "info"}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        clickable
        icon={<ArrowDropDownIcon />}
      />

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {(["waiting", "in_progress", "served"] as Status[]).map((s) => (
          <MenuItem key={s} selected={draft === s} onClick={() => choose(s)}>
            {STATUS_LABEL[s]}
          </MenuItem>
        ))}
      </Menu>

      {dirty && (
        <Stack direction="row" spacing={1}>
          <button onClick={ ()=>onSave(draft)}>Save</button>
          <button onClick={() => setDraft(value)}>Cancel</button>
        </Stack>
      )}
    </Stack>
  );
}
