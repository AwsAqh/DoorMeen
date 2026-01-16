// StatusEditor.tsx
import * as React from "react";
import { useTranslation } from 'react-i18next';
import { Chip, Menu, MenuItem, Stack } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import type { Status } from "../components/Helpers/status";
import { getStatusLabel } from "../components/Helpers/status";

export function StatusEditor({
  value,
  onSave,
  inline = true,
}: {
  value: Status;
  onSave: (nextStatus:Status) => void| Promise<void>;
  inline?: boolean;
}) {
  const { t } = useTranslation();
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
        label={getStatusLabel(draft)}
        color={draft === "served" ? "success" : draft === "in_progress" ? "warning" : "info"}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        clickable
        icon={<ArrowDropDownIcon />}
      />

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {(["waiting", "in_progress", "served"] as Status[]).map((s) => (
          <MenuItem key={s} selected={draft === s} onClick={() => choose(s)}>
            {getStatusLabel(s)}
          </MenuItem>
        ))}
      </Menu>

      {dirty && (
        <Stack direction="row" spacing={1}>
          <button onClick={ ()=>onSave(draft)}>{t('common.save')}</button>
          <button onClick={() => setDraft(value)}>{t('common.cancel')}</button>
        </Stack>
      )}
    </Stack>
  );
}
