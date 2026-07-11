import { Box, Typography } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';
const STAMP = 'Stampette, monospace';
const CREAM = brandColors.warmCream;
const PAPER = '#FDF9EF';
const STAMP_BLUE = '#1e40af';

/** Shared look for the app-visual vignette images. */
const VIGNETTE_IMG = {
  width: '100%',
  borderRadius: '10px',
  border: `3px solid ${PAPER}`,
  boxShadow: '0 16px 32px rgba(0,0,0,0.32)',
  display: 'block',
} as const;

const CAPTION = {
  textAlign: 'center',
  fontFamily: MONO,
  fontSize: '11.5px',
  color: 'rgba(249,245,235,0.6)',
  mt: '14px',
} as const;

function Kicker({ children }: { children: string }) {
  return (
    <Typography
      sx={{
        fontFamily: MONO,
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.16em',
        color: brandColors.mustardYellow,
        mb: '10px',
      }}
    >
      {children}
    </Typography>
  );
}

function BeatTitle({ children }: { children: string }) {
  return (
    <Typography
      component="h3"
      sx={{
        fontFamily: TYPEWRITER,
        fontWeight: 400,
        fontSize: { xs: '23px', md: '27px' },
        color: CREAM,
        m: '0 0 12px 0',
      }}
    >
      {children}
    </Typography>
  );
}

function BeatBody({ children }: { children: string }) {
  return (
    <Typography
      sx={{
        fontSize: '16.5px',
        lineHeight: 1.6,
        color: 'rgba(249,245,235,0.8)',
        m: 0,
      }}
    >
      {children}
    </Typography>
  );
}

/** Angled rubber stamp overlaid on a vignette. */
function VignetteStamp({
  label,
  sx,
}: {
  label: string;
  sx: Record<string, unknown>;
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        border: `2.5px solid ${STAMP_BLUE}`,
        color: STAMP_BLUE,
        background: 'rgba(253,249,239,0.95)',
        fontFamily: STAMP,
        letterSpacing: '0.14em',
        padding: '4px 12px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}

/** One beat row: text and visual, alternating sides on desktop. */
function Beat({
  visualSide,
  visualWidth,
  text,
  visual,
}: {
  visualSide: 'left' | 'right';
  visualWidth: number;
  text: React.ReactNode;
  visual: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md:
            visualSide === 'right'
              ? `1fr ${visualWidth}px`
              : `${visualWidth}px 1fr`,
        },
        gap: { xs: '28px', md: '48px' },
        alignItems: 'center',
      }}
    >
      {/* Text reads first on mobile regardless of desktop side. */}
      <Box sx={{ order: { xs: 1, md: visualSide === 'right' ? 1 : 2 } }}>
        {text}
      </Box>
      <Box sx={{ order: { xs: 2, md: visualSide === 'right' ? 2 : 1 } }}>
        {visual}
      </Box>
    </Box>
  );
}

/**
 * How it works, v3 (design handoff 3): four beats on the ink band, each
 * paired with a real app visual — the photo→watercolor moment, the shelf,
 * a borrow request, and the libraries themselves.
 */
export function HowItWorks() {
  return (
    <Box
      id="how"
      component="section"
      sx={{
        background: brandColors.inkBlue,
        padding: { xs: '60px 20px', md: '90px 72px' },
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: TYPEWRITER,
          fontWeight: 400,
          fontSize: { xs: '34px', md: '44px' },
          color: CREAM,
          m: '0 0 12px 0',
          textAlign: 'center',
        }}
      >
        How it works
      </Typography>
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: '14px',
          color: 'rgba(249,245,235,0.65)',
          textAlign: 'center',
          m: { xs: '0 0 44px 0', md: '0 0 64px 0' },
          letterSpacing: '0.1em',
        }}
      >
        SAME IDEA AS THE LIBRARY — BUT THE STUFF STAYS IN YOUR GARAGE
      </Typography>

      <Box
        sx={{
          maxWidth: 1000,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: '44px', md: '56px' },
        }}
      >
        {/* 01 — the photo→watercolor moment */}
        <Beat
          visualSide="right"
          visualWidth={460}
          text={
            <>
              <Kicker>01 · VIRTUAL SHELVES</Kicker>
              <BeatTitle>Point. Click. Share.</BeatTitle>
              <BeatBody>
                Take a picture of your borrowable stuff and it joins your
                neighborhood&apos;s shared virtual shelf — recognized
                automatically and painted as a little watercolor portrait. No
                forms, no data entry. And the stuff itself never moves: it keeps
                living in your garage, shed, and sports bins.
              </BeatBody>
            </>
          }
          visual={
            <Box sx={{ position: 'relative', pb: '10px' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  alignItems: 'center',
                }}
              >
                <Box
                  component="img"
                  src="/how-it-works/drill-photo.jpg"
                  alt="Phone photo of a cordless drill"
                  sx={{
                    ...VIGNETTE_IMG,
                    aspectRatio: '0.96',
                    objectFit: 'cover',
                    boxShadow: '0 14px 28px rgba(0,0,0,0.32)',
                    transform: 'rotate(-3deg)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
                <Box
                  component="img"
                  src="/how-it-works/drill-watercolor.jpg"
                  alt="The same drill as a watercolor catalog card"
                  sx={{
                    ...VIGNETTE_IMG,
                    aspectRatio: '0.96',
                    objectFit: 'cover',
                    boxShadow: '0 14px 28px rgba(0,0,0,0.32)',
                    transform: 'rotate(2.5deg)',
                  }}
                />
              </Box>
              <VignetteStamp
                label="RECOGNIZED ✓"
                sx={{
                  top: '46%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-6deg)',
                  zIndex: 2,
                  fontSize: '14px',
                }}
              />
              <Typography sx={CAPTION}>
                your photo → its portrait, painted on the spot
              </Typography>
            </Box>
          }
        />

        {/* 02 — the shelf */}
        <Beat
          visualSide="left"
          visualWidth={420}
          text={
            <>
              <Kicker>02 · SHARE MORE, BUY LESS</Kicker>
              <BeatTitle>See the borrowable world around you.</BeatTitle>
              <BeatBody>
                Need some tools for a quick weekend project? Check the stuff
                library first. Most of what a project needs already exists
                within a few hundred feet of your door, so no need to buy your
                own.
              </BeatBody>
            </>
          }
          visual={
            <Box sx={{ transform: 'rotate(-1.5deg)' }}>
              <Box
                component="img"
                src="/how-it-works/hardware-shelf-v2.jpg"
                alt="The Tools & Hardware shelf in the app: a claw hammer and cordless drill, both available"
                sx={VIGNETTE_IMG}
              />
              <Typography sx={CAPTION}>
                the hardware aisle, three doors wide
              </Typography>
            </Box>
          }
        />

        {/* 03 — the borrow request */}
        <Beat
          visualSide="right"
          visualWidth={420}
          text={
            <>
              <Kicker>03 · BORROW LIKE A LIBRARY</Kicker>
              <BeatTitle>Asking is easy, not awkward.</BeatTitle>
              <BeatBody>
                One tap to request. Everyone can see who borrowed what and when
                it&apos;s due back — the gentle mechanics of a library, so being
                a good borrower (and a relaxed lender) is the easy default.
              </BeatBody>
            </>
          }
          visual={
            <Box sx={{ position: 'relative', transform: 'rotate(1.2deg)' }}>
              <Box
                component="img"
                src="/how-it-works/borrow-request.jpg"
                alt="A borrow request in the app: Maya Chen wants to borrow your cordless drill, return by Thursday July 16"
                sx={VIGNETTE_IMG}
              />
              <VignetteStamp
                label="APPROVED"
                sx={{
                  right: '18px',
                  bottom: '24px',
                  transform: 'rotate(-8deg)',
                  fontSize: '17px',
                  letterSpacing: '0.16em',
                  padding: '5px 14px',
                  background: 'rgba(253,249,239,0.92)',
                  border: `3px solid ${STAMP_BLUE}`,
                }}
              />
              <Typography sx={CAPTION}>
                one tap to ask, one tap to say yes — due date on the record
              </Typography>
            </Box>
          }
        />

        {/* 04 — the libraries themselves */}
        <Beat
          visualSide="left"
          visualWidth={420}
          text={
            <>
              <Kicker>04 · GROWN BY NEIGHBORS, NOT ADS</Kicker>
              <BeatTitle>
                Community-run. Non-commercial. Invitation only.
              </BeatTitle>
              <BeatBody>
                Libraries grow one invitation at a time, and you can belong to
                more than one. There are no ads, no fees, and nothing for sale —
                just neighborhoods sharing more and buying less.
              </BeatBody>
            </>
          }
          visual={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  name: 'Elmwood Neighbors',
                  meta: '12 members · your street',
                  tilt: -0.8,
                  stampTilt: 6,
                  ml: 0,
                },
                {
                  name: 'Maple St Tool Crew',
                  meta: '8 members · invited by Sam',
                  tilt: 0.7,
                  stampTilt: -5,
                  ml: '26px',
                },
              ].map((lib) => (
                <Box
                  key={lib.name}
                  sx={{
                    background: PAPER,
                    border: `2px solid ${brandColors.inkBlue}`,
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transform: `rotate(${lib.tilt}deg)`,
                    ml: lib.ml,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: 'Merriweather, Georgia, serif',
                        fontWeight: 700,
                        fontSize: '16px',
                        color: brandColors.inkBlue,
                      }}
                    >
                      {lib.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: MONO,
                        fontSize: '11px',
                        color: 'rgba(63,52,43,0.6)',
                      }}
                    >
                      {lib.meta}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      border: `2px solid ${brandColors.tomatoRed}`,
                      color: brandColors.tomatoRed,
                      fontFamily: STAMP,
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      transform: `rotate(${lib.stampTilt}deg)`,
                      opacity: 0.85,
                    }}
                  >
                    MEMBER
                  </Box>
                </Box>
              ))}
              <Box
                sx={{
                  border: '2px dashed rgba(249,245,235,0.4)',
                  borderRadius: '8px',
                  padding: '12px 18px',
                  fontFamily: MONO,
                  fontSize: '12px',
                  color: 'rgba(249,245,235,0.65)',
                  textAlign: 'center',
                  ml: '13px',
                }}
              >
                ＋ your invitation could start the next one
              </Box>
            </Box>
          }
        />
      </Box>
    </Box>
  );
}
