// src/components/shared/ResourceList.tsx

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Fab,
  IconButton,
  Tooltip,
  Snackbar,
  Button,
  Box,
  useMediaQuery,
  useTheme,
  Typography,
  TableSortLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';

// --- Generic Types for Reusability ---

type Order = 'asc' | 'desc';

// The base shape of any item the list can handle
type BaseItem = {
  id: string;
  name: string;
};

// Describes a table header column
export interface HeadCell<T> {
  id: keyof T;
  label: string;
  align?: 'left' | 'right' | 'center' | 'justify';
}

// Props for the generic Dialog component
interface DialogProps<T> {
  onClose: () => void;
  editItem: T | null;
  existingNames: string[];
}

// Main props for our generic ResourceList
interface ResourceListProps<T extends BaseItem> {
  items: T[];
  headCells: readonly HeadCell<T>[];
  i18nKeys: {
    empty: string;
    deleted: string;
    undone: string;
    actions: string;
    edit: string;
    delete: string;
  };
  onDelete: (item: T) => void;
  onUndo?: () => void;
  renderDataCells: (item: T) => React.ReactNode;
  renderCard: (item: T) => React.ReactNode;
  DialogComponent: React.ComponentType<DialogProps<any>>; // Using 'any' to accommodate different original item types
  getUndoContext?: () => boolean;
  getOriginalItem?: (item: T) => any; // Function to get the original, unconverted item for editing
}

// --- Sorting Helper Functions ---

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  const valA = a[orderBy];
  const valB = b[orderBy];
  if (typeof valA === 'number' && typeof valB === 'number') {
    return valB - valA;
  }
  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}

function getComparator<T>(order: Order, orderBy: keyof T): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// --- The Generic Component ---

export default function ResourceList<T extends BaseItem>({
  items,
  headCells,
  i18nKeys,
  onDelete,
  onUndo,
  renderDataCells,
  renderCard,
  DialogComponent,
  getUndoContext,
  getOriginalItem,
}: ResourceListProps<T>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- State Management ---
  const [openDialog, setOpenDialog] = React.useState(false);
  // FIX: State holds the full generic item type `T` (or the original item type from getOriginalItem)
  const [editItem, setEditItem] = React.useState<T | null>(null);
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string }>({
    open: false,
    msg: '',
  });
  const [order, setOrder] = React.useState<Order>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof T>('name');

  const existingNames = React.useMemo(() => items.map((i) => i.name), [items]);

  // --- Handlers ---
  const handleRequestSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleDelete = (item: T) => {
    onDelete(item);
    setSnack({ open: true, msg: t(i18nKeys.deleted) });
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
      setSnack({ open: false, msg: '' });
      setTimeout(() => setSnack({ open: true, msg: t(i18nKeys.undone) }), 100);
    }
  };

  const handleOpenEdit = (item: T) => {
    // Use `getOriginalItem` if provided, to ensure the dialog gets the unconverted data
    const itemToEdit = getOriginalItem ? getOriginalItem(item) : item;
    setEditItem(itemToEdit);
    setOpenDialog(true);
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditItem(null);
  };

  const handleCloseSnackbar = () => {
    setSnack({ open: false, msg: '' });
  };

  // --- Derived Data ---
  const sortedRows = React.useMemo(
    () => [...items].sort(getComparator(order, orderBy)),
    [items, order, orderBy],
  );

  const isUndoable = getUndoContext ? getUndoContext() : false;

  const mobileView = (
    <>
      <Box sx={{ pb: 10 }}>
        {sortedRows.map((item) => (
          <Paper key={item.id} sx={{ p: 2, mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ flex: 1, mr: 1 }}>{renderCard(item)}</Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton color="primary" size="small" onClick={() => handleOpenEdit(item)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton color="error" size="small" onClick={() => handleDelete(item)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ))}
        {items.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">{t(i18nKeys.empty)}</Typography>
          </Paper>
        )}
      </Box>
    </>
  );

  const desktopView = (
    <TableContainer component={Paper} sx={{ width: '100%' }}>
      <Table size="medium">
        <TableHead>
          <TableRow>
            {headCells.map((headCell) => (
              <TableCell
                key={headCell.id as string}
                align={headCell.align || 'left'}
                sortDirection={orderBy === headCell.id ? order : false}
              >
                <TableSortLabel
                  active={orderBy === headCell.id}
                  direction={orderBy === headCell.id ? order : 'asc'}
                  onClick={() => handleRequestSort(headCell.id)}
                  sx={{
                    flexDirection: headCell.align === 'right' ? 'row' : 'row-reverse',
                    justifyContent: headCell.align === 'right' ? 'flex-end' : 'flex-start',
                    '&': { width: '100%' },
                    '& .MuiTableSortLabel-icon': {
                      marginLeft: headCell.align !== 'right' ? 1 : 0,
                      marginRight: headCell.align === 'right' ? 1 : 0,
                    },
                  }}
                >
                  {headCell.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell align="right">{t(i18nKeys.actions)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((item) => (
            <TableRow key={item.id} hover>
              {renderDataCells(item)}
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <Tooltip title={t(i18nKeys.edit)}>
                    <IconButton color="primary" size="small" onClick={() => handleOpenEdit(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t(i18nKeys.delete)}>
                    <IconButton color="error" size="small" onClick={() => handleDelete(item)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={headCells.length + 1}
                sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}
              >
                {t(i18nKeys.empty)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      {isMobile ? mobileView : desktopView}

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', right: { xs: 16, md: 24 }, bottom: { xs: 16, md: 24 } }}
        onClick={handleOpenAdd}
      >
        <AddIcon />
      </Fab>

      {openDialog && (
        <DialogComponent
          onClose={handleCloseDialog}
          editItem={editItem}
          existingNames={existingNames.filter((n) => n !== editItem?.name)}
        />
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        message={snack.msg}
        action={
          isUndoable && onUndo ? (
            <Button color="secondary" size="small" onClick={handleUndo}>
              {t('investmentsList.undo')} {/* Using a common undo key */}
            </Button>
          ) : null
        }
      />
    </>
  );
}
