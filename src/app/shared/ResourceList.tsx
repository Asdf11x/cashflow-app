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
import LaunchIcon from '@mui/icons-material/Launch';

type Order = 'asc' | 'desc';
type BaseItem = {
  id: string;
  name: string;
  link?: string;
};

export interface HeadCell<T> {
  id: keyof T;
  label: string;
  align?: 'left' | 'right' | 'center' | 'justify';
}

interface DialogProps<T> {
  onClose: () => void;
  editItem: T | null;
  existingNames: string[];
}

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
  DialogComponent: React.ComponentType<DialogProps<any>>;
  getUndoContext?: () => boolean;
  getOriginalItem?: (item: T) => any;
}

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

function LinkedNameDisplay<T extends BaseItem>({ item }: { item: T }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const typographyVariant = isMobile ? 'subtitle1' : 'body2';
  const fontWeight = isMobile ? 'bold' : 'normal';

  if (!item.link) {
    return (
      <Typography component="span" variant={typographyVariant} sx={{ fontWeight }}>
        {item.name}
      </Typography>
    );
  }

  return (
    <Typography
      component="a"
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      variant={typographyVariant}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'primary.main',
        fontWeight: fontWeight,
        '&:hover': {
          textDecoration: 'underline',
        },
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Box sx={{ mr: 0.5 }}>{item.name}</Box>
      <LaunchIcon
        sx={{
          color: 'primary.main',
          width: 12,
          height: 12,
          verticalAlign: 'super',
          ml: 0.1,
        }}
      />
    </Typography>
  );
}

// --- NEW: Define the type for the component with its static helper property ---
interface IResourceList {
  <T extends BaseItem>(props: ResourceListProps<T>): React.ReactElement | null;
  LinkedNameDisplay: typeof LinkedNameDisplay;
}

// --- The Generic Component ---

const ResourceListInternal = <T extends BaseItem>({
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
}: ResourceListProps<T>) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- State Management ---
  const [openDialog, setOpenDialog] = React.useState(false);
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
          // MODIFIED: Removed position: 'relative' as we will use a flex layout
          <Paper key={item.id} sx={{ p: 2, mb: 2 }}>
            {/* NEW/MODIFIED: Container for card content and action buttons */}
            <Box>
              {/* The renderCard prop is expected to render the name/title with variant="h6" or similar,
                  followed by the rest of the content in a separate Box. We need to split this for the flex layout.

                  Since renderCard can contain the entire block, the best approach is to check if it returns
                  an element where the name is the first child (like a Typography or LinkedNameDisplay).
                  However, based on the consumer files (CreditsList/InvestmentsList/CashflowList),
                  renderCard is structured as:

                  <>
                    <Typography variant="h6" ...> <ResourceList.LinkedNameDisplay /> </Typography>
                    <Box> ... other content ... </Box>
                  </>

                  We will assume this structure and render the header part manually using flex,
                  and render the rest of the content after the header.
              */}

              {/* Header: Name/Title (from renderCard's first element) and Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  // Ensure this container has a bottom margin if needed to separate from content
                  mb: 1,
                }}
              >
                {/* Name/Title - This should be the main title element from renderCard.
                    We will replicate the title/name part for proper alignment.
                    This requires a slight change in the assumption of `renderCard`'s output,
                    but is necessary for proper mobile alignment without complex parsing.
                */}
                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, mr: 1, minWidth: 0 }}>
                  <ResourceList.LinkedNameDisplay item={item} />
                </Typography>

                {/* Horizontal Action Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, flexShrink: 0 }}>
                  <IconButton color="primary" size="small" onClick={() => handleOpenEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDelete(item)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* The remaining card content (everything *except* the name/title) */}
              <Box>
                {/* To fix the issue, we need to manually process renderCard output
                    to remove the name/title part if it exists, or update all call sites.

                    Since updating all call sites (CreditsList, InvestmentsList, CashflowList)
                    to *only* render the body content is the most robust way to align
                    with the new flex header, I will update them to only render the body.

                    The current implementation is:

                    renderCard={(c) => (
                        <>
                            <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                <ResourceList.LinkedNameDisplay item={c} />
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
                                ... content ...
                            </Box>
                        </>
                    )}

                    I will update them to:

                    renderCard={(c) => (
                        <>
                            <Chip ... /> // Only for InvestmentsList
                            <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
                                ... content ...
                            </Box>
                        </>
                    )}

                    AND, I will remove the manual Typography from `renderCard` in the consumer files
                    since the new `ResourceList` handles the name/title display.
                */}
                {/* The card content is rendered below the new flex header */}
                {renderCard(item)}
              </Box>
            </Box>

            {/* REMOVED OLD ICON AND WRAPPER STRUCTURES */}
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
                    flexDirection: headCell.align === 'right' ? 'row-reverse' : 'row',
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
              {t('investmentsList.undo')}
            </Button>
          ) : null
        }
      />
    </>
  );
};

const ResourceList = ResourceListInternal as IResourceList;
ResourceList.LinkedNameDisplay = LinkedNameDisplay;
export default ResourceList;
