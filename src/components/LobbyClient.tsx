'use client';

import { Alert, Box, Skeleton, Snackbar } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCapabilities } from '@/hooks/useCapabilities';
import { useCollections } from '@/hooks/useCollections';
import { useUserItems } from '@/hooks/useUserItems';
import type { CapabilityReason } from '@/lib/capabilities';
import {
  cardNumber,
  firstNameOf,
  memberSinceLabel,
  splitLibraries,
} from '@/lib/member-home';
import { brandColors } from '@/theme/brandTokens';

import { CollectionCreationModal } from './CollectionCreationModal';
import { CompleteProfilePrompt } from './CompleteProfilePrompt';
import { GreetingDesk } from './member-home/GreetingDesk';
import { DrawerSectionLabel, LibraryDrawer } from './member-home/LibraryDrawer';
import {
  JoinedEmptyState,
  LibraryFolderCard,
  NewLibraryFolderCard,
} from './member-home/LibraryFolderCard';
import { AddShelfCard, ShelfItemCard } from './member-home/ShelfItemCard';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  bio?: string | null;
  createdAt?: Date | string;
}

interface LobbyClientProps {
  user: User;
  showWelcome: boolean;
}

// minmax(0, 1fr), not bare 1fr: a bare 1fr column can't shrink below its
// content's min width, so one long nowrap item title blows out the whole grid.
const LIBRARY_GRID = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
  },
  gap: '28px',
} as const;

const SHELF_GRID = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
  },
  gap: '22px',
} as const;

/** Skeleton matching the drawer's card grids so nothing jumps on load. */
function DrawerGridSkeleton({ columnsSx }: { columnsSx: object }) {
  return (
    <Box sx={columnsSx}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Box key={i}>
          <Skeleton
            variant="rounded"
            sx={{ width: '100%', height: 180, borderRadius: 2, mb: 1 }}
          />
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="45%" />
        </Box>
      ))}
    </Box>
  );
}

export function LobbyClient({ user, showWelcome }: LobbyClientProps) {
  const router = useRouter();
  const { collections, isLoading, createCollection } = useCollections();
  const {
    readyToLendItems,
    onLoanItems,
    offlineItems,
    borrowedItems,
    isLoading: itemsLoading,
  } = useUserItems();
  const { capabilities } = useCapabilities();

  const [activeTab, setActiveTab] = useState('libraries');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [promptReason, setPromptReason] = useState<CapabilityReason | null>(
    null
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [createdCollectionName, setCreatedCollectionName] = useState('');

  const handleCreateLibraryClick = () => {
    if (capabilities && !capabilities.canCreateLibrary) {
      setPromptReason(capabilities.reasons.canCreateLibrary ?? 'NEEDS_ADDRESS');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleAddStuffClick = () => {
    if (capabilities && !capabilities.canLend) {
      setPromptReason(capabilities.reasons.canLend ?? 'NEEDS_PHOTO');
      return;
    }
    router.push('/add-item');
  };

  const handleCreateCollection = (collection: {
    id?: string;
    name?: string;
  }) => {
    // Drop the user straight into their new library so it's obvious how to
    // start adding stuff, rather than back on the home list.
    if (collection.id) {
      router.push(`/library/${collection.id}`);
      return;
    }
    setCreatedCollectionName(collection.name || 'Your library');
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 4000);
  };

  const { started, joined } = splitLibraries(collections);

  // Every shelf card renders from one shape: the item + a stamp status.
  const shelfItems = [
    ...readyToLendItems.map((item) => ({
      ...item,
      status: 'ready-to-lend' as const,
    })),
    ...onLoanItems.map((item) => ({ ...item, status: 'on-loan' as const })),
    ...offlineItems.map((item) => ({ ...item, status: 'offline' as const })),
  ];

  // Borrowed entries are borrow-requests wrapping someone else's item. They
  // carry the due date and lead to the request page — where Mark as
  // Returned lives — not the item page, which is the owner's surface (#442).
  const borrowedShelfItems = borrowedItems.map((request) => ({
    id: request.item.id,
    name: request.item.name,
    imageUrl: request.item.imageUrl,
    watercolorUrl: request.item.watercolorUrl,
    watercolorThumbUrl: request.item.watercolorThumbUrl,
    condition: 'good',
    createdAt: request.createdAt,
    status: 'borrowed' as const,
    borrowRequest: { requestedReturnDate: request.requestedReturnDate },
    href: `/borrow-requests/${request.id}`,
  }));

  const inviteFromEmptyJoined = () => {
    // The nearest place an invite can actually happen: the first library the
    // user runs; with none, starting one IS the next step.
    if (started[0]) {
      router.push(`/library/${started[0].id}`);
    } else {
      handleCreateLibraryClick();
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 1180,
        width: '100%',
        mx: 'auto',
        px: { xs: 2, sm: '48px' },
        pt: { xs: 4, md: '56px' },
        pb: { xs: 6, md: '90px' },
        boxSizing: 'border-box',
      }}
    >
      {showWelcome && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          Welcome, {user.name}! This is home base: start a library with people
          you trust, or join one you&rsquo;re invited to.
        </Alert>
      )}

      <GreetingDesk
        eyebrow={memberSinceLabel(user.createdAt)}
        cardNumber={cardNumber(user.id)}
        firstName={firstNameOf(user.name)}
      />

      <LibraryDrawer
        tabs={[
          { id: 'libraries', label: 'LIBRARIES' },
          { id: 'stuff', label: 'MY STUFF' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      >
        {activeTab === 'libraries' ? (
          <Box>
            <DrawerSectionLabel>LIBRARIES I STARTED</DrawerSectionLabel>
            {isLoading ? (
              <DrawerGridSkeleton columnsSx={LIBRARY_GRID} />
            ) : (
              <Box sx={{ ...LIBRARY_GRID, mb: '48px' }}>
                {started.map((collection) => (
                  <LibraryFolderCard
                    key={collection.id}
                    collection={collection}
                  />
                ))}
                <NewLibraryFolderCard onClick={handleCreateLibraryClick} />
              </Box>
            )}

            <DrawerSectionLabel>LIBRARIES I&rsquo;VE JOINED</DrawerSectionLabel>
            {isLoading ? (
              <DrawerGridSkeleton columnsSx={LIBRARY_GRID} />
            ) : joined.length > 0 ? (
              <Box sx={LIBRARY_GRID}>
                {joined.map((collection) => (
                  <LibraryFolderCard
                    key={collection.id}
                    collection={collection}
                  />
                ))}
              </Box>
            ) : (
              <JoinedEmptyState
                onInvite={inviteFromEmptyJoined}
                previewUrl={started[0]?.itemPreviews?.[0]}
                ownedLibraryName={started[0]?.name}
              />
            )}
          </Box>
        ) : (
          <Box>
            <DrawerSectionLabel>MY SHELF</DrawerSectionLabel>
            {itemsLoading ? (
              <DrawerGridSkeleton columnsSx={SHELF_GRID} />
            ) : (
              <Box sx={SHELF_GRID}>
                {shelfItems.map((item, index) => (
                  <ShelfItemCard
                    key={`${item.status}-${item.id}`}
                    item={item}
                    index={index}
                  />
                ))}
                <AddShelfCard onClick={handleAddStuffClick} />
              </Box>
            )}

            {/* Stuff I'm holding right now — the borrower's way back to the
                loan (and Mark as Returned) without digging up a notification
                (#442). */}
            {!itemsLoading && borrowedShelfItems.length > 0 && (
              <>
                <Box sx={{ mt: '48px' }}>
                  <DrawerSectionLabel>BORROWED</DrawerSectionLabel>
                </Box>
                <Box sx={SHELF_GRID}>
                  {borrowedShelfItems.map((item, index) => (
                    <ShelfItemCard
                      key={`borrowed-${item.id}`}
                      item={item}
                      index={index}
                    />
                  ))}
                </Box>
              </>
            )}
          </Box>
        )}
      </LibraryDrawer>

      {/* Library Creation Modal */}
      <CollectionCreationModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateCollection}
        createCollection={createCollection}
      />

      {/* Just-in-time complete-profile prompt for locked actions */}
      <CompleteProfilePrompt
        reason={promptReason}
        missing={capabilities?.missingProfileFacts}
        open={promptReason !== null}
        onClose={() => setPromptReason(null)}
      />

      {/* Success Message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={4000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          variant="filled"
          sx={{
            backgroundColor: brandColors.inkBlue,
            color: brandColors.white,
          }}
        >
          🎉 <strong>&ldquo;{createdCollectionName}&rdquo;</strong> is ready!
        </Alert>
      </Snackbar>
    </Box>
  );
}
