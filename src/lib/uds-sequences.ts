import type { ByteType } from '@/components/uds/hex-byte-display';

export type NodeRole = 'tester' | 'ecu';

export interface SequenceStep {
  id: string;
  label: string;
  from: NodeRole;
  to: NodeRole;
  bytes: string[];
  byteTypes: ByteType[];
  description: string;
  timingMs: number;
  isNegative?: boolean;
  isoTpFrame?: string;
}

export interface SequencePreset {
  id: string;
  name: string;
  description: string;
  successSteps: SequenceStep[];
  negativeSteps: SequenceStep[];
}

// ──────────── Helper ────────────

function req(bytes: string[], byteTypes: ByteType[], label: string, desc: string, timingMs: number, isoTpFrame?: string): SequenceStep {
  return { id: label.replace(/\s/g, '-').toLowerCase(), label, from: 'tester', to: 'ecu', bytes, byteTypes, description: desc, timingMs, isoTpFrame };
}

function resp(bytes: string[], byteTypes: ByteType[], label: string, desc: string, timingMs: number, isoTpFrame?: string): SequenceStep {
  return { id: label.replace(/\s/g, '-').toLowerCase(), label, from: 'ecu', to: 'tester', bytes, byteTypes, description: desc, timingMs, isoTpFrame };
}

function negResp(bytes: string[], byteTypes: ByteType[], label: string, desc: string, timingMs: number): SequenceStep {
  return { id: label.replace(/\s/g, '-').toLowerCase(), label, from: 'ecu', to: 'tester', bytes, byteTypes, description: desc, timingMs, isNegative: true, isoTpFrame: 'SF' };
}

const S: ByteType = 'sid';
const SF: ByteType = 'subfunction';
const P: ByteType = 'parameter';
const D: ByteType = 'data';
const N: ByteType = 'normal';

// ──────────── Security Access ────────────

const securitySuccess: SequenceStep[] = [
  req(['27', '01'], [S, SF], 'Request Seed',
    'Tester requests a security seed from the ECU to begin the authentication process. Sub-function 0x01 = requestSeed.',
    50, 'SF (2 bytes)'),
  resp(['67', '01', 'A3', 'B7', 'C1', 'D5'], [S, SF, D, D, D, D], 'Seed Response',
    'ECU responds with a 4-byte random seed. The tester must compute a key using the shared secret algorithm (e.g., AES-128, XOR).',
    200, 'SF (6 bytes)'),
  req(['27', '02', '5F', '3A', '7E', '08'], [S, SF, D, D, D, D], 'Send Key',
    'Tester sends the computed key derived from the seed. Sub-function 0x02 = sendKey. The key algorithm is OEM-specific.',
    50, 'SF (6 bytes)'),
  resp(['67', '02'], [S, SF], 'Key Accepted',
    'ECU verifies the key. Positive response (SID+0x40) confirms the security level is now unlocked. Protected services (0x11, 0x27, 0x31, 0x34, 0x3D, 0x3E, 0x75, 0x77) are now accessible.',
    100, 'SF (2 bytes)'),
];

const securityNegative: SequenceStep[] = [
  req(['27', '01'], [S, SF], 'Request Seed',
    'Tester requests a security seed from the ECU.',
    50, 'SF (2 bytes)'),
  resp(['67', '01', 'A3', 'B7', 'C1', 'D5'], [S, SF, D, D, D, D], 'Seed Response',
    'ECU responds with a 4-byte random seed.',
    200, 'SF (6 bytes)'),
  req(['27', '02', 'FF', 'FF', 'FF', 'FF'], [S, SF, D, D, D, D], 'Send Key (Wrong)',
    'Tester sends an incorrect key. This can happen due to wrong algorithm implementation, corrupted seed, or clock drift.',
    50, 'SF (6 bytes)'),
  negResp(['7F', '27', '35', '03'], [S, SF, D, N], 'Incorrect Key',
    'Negative response: 0x35 = Incorrect Key (Remaining Attempts: 3). After all attempts are exhausted, the ECU may lock security access permanently until power cycle.',
    100),
];

// ──────────── Data Transfer ────────────

const transferSuccess: SequenceStep[] = [
  req(['34', '00', '44', '00', 'C0', '00', '08'], [S, SF, D, D, D, D, D], 'Request Download',
    'Tester requests to download (write) data to ECU memory. Address: 0x00C00000, Length: 0x0008 bytes. The ECU prepares the memory buffer.',
    150, 'SF (7 bytes)'),
  resp(['74', '20', '00', 'E0'], [S, SF, D, D], 'Download Accepted',
    'ECU accepts the download request. maxNumberOfBlockLength = 0x00E0 (224 bytes). All subsequent TransferData requests must not exceed this block size.',
    300, 'SF (4 bytes)'),
  req(['36', '01', 'DA', '7E', '01', '00', '00'], [S, SF, D, D, D, D], 'TransferData (Block 1)',
    'First data block (blockSequenceCounter = 0x01). Contains the actual firmware/data payload. Block size must be ≤ maxNumberOfBlockLength.',
    500, 'SF (7 bytes)'),
  resp(['76', '01'], [S, SF], 'Block 1 Confirmed',
    'ECU acknowledges receipt of block 1. The blockSequenceCounter in the response confirms which block was accepted.',
    50, 'SF (2 bytes)'),
  req(['36', '02', 'FF', '00', '00', '00', '00'], [S, SF, D, D, D, D], 'TransferData (Block 2)',
    'Second data block (blockSequenceCounter = 0x02). The counter rolls over from 0xFF to 0x00.',
    500, 'SF (7 bytes)'),
  resp(['76', '02'], [S, SF], 'Block 2 Confirmed',
    'ECU acknowledges receipt of block 2. Memory is being written.',
    50, 'SF (2 bytes)'),
  req(['37'], [S], 'Request Transfer Exit',
    'Tester signals the end of data transfer. The ECU should now verify the complete data integrity (checksum/CRC) and finalize the write operation.',
    100, 'SF (1 byte)'),
  resp(['77'], [S], 'Transfer Complete',
    'ECU confirms successful transfer and data verification. The written data is now valid in ECU memory.',
    1000, 'SF (1 byte)'),
];

const transferNegative: SequenceStep[] = [
  req(['34', '00', '44', 'FF', 'FF', 'FF', '08'], [S, SF, D, D, D, D, D], 'Request Download (Invalid)',
    'Tester requests download to invalid memory address 0xFFFFFF08, which is outside the ECU addressable range.',
    150, 'SF (7 bytes)'),
  negResp(['7F', '34', '31'], [S, SF, N], 'Request Out Of Range',
    'Negative response: 0x31 = Request Out Of Range. The specified address and/or length is not valid for this ECU. Check the memory map in the ECU documentation.',
    200),
];

// ──────────── ECU Reset ────────────

const resetSuccess: SequenceStep[] = [
  req(['11', '01'], [S, SF], 'ECU Reset (Hard)',
    'Tester requests a hard reset of the ECU. Sub-function 0x01 = hardReset (power cycle equivalent). All volatile memory is cleared.',
    200, 'SF (2 bytes)'),
  resp(['51', '01'], [S, SF], 'Reset Accepted',
    'ECU acknowledges the reset request. It will now perform a complete shutdown sequence, clear all DTCs (if enabled), and reboot.',
    50, 'SF (2 bytes)'),
  req(['10', '01'], [S, SF], 'Default Session (Re-init)',
    'After the ECU reboots (~2000ms), the tester sends DefaultSession to re-initialize communication. This is required because the ECU lost session state during reset.',
    2000, 'SF (2 bytes)'),
  resp(['50', '01', '00', '32', '01', 'F4'], [S, SF, D, D, D, D], 'Session Set',
    'ECU confirms default session. P2 max = 0x0032 (50ms), S3 server = 0x01F4 (5000ms). The tester must send TesterPresent within S3 timeout.',
    50, 'SF (6 bytes)'),
];

const resetNegative: SequenceStep[] = [
  req(['11', '01'], [S, SF], 'ECU Reset (Hard)',
    'Tester requests a hard reset, but the ECU has active operations that prevent a safe reset (e.g., ongoing data transfer, active routine).',
    200, 'SF (2 bytes)'),
  negResp(['7F', '11', '22'], [S, SF, N], 'Conditions Not Correct',
    'Negative response: 0x22 = Conditions Not Correct (Reset Prevented). The ECU cannot reset while certain services are active. Stop all active operations first.',
    200),
];

// ──────────── Session Management ────────────

const sessionSuccess: SequenceStep[] = [
  req(['10', '03'], [S, SF], 'Extended Diagnostic Session',
    'Tester switches to extended diagnostic session (0x03). This unlocks access to additional diagnostic services like 0x27, 0x31, 0x34, 0x3D, 0x75, 0x77. S3 timeout starts.',
    50, 'SF (2 bytes)'),
  resp(['50', '03', '00', '50', '00', 'FA'], [S, SF, D, D, D, D], 'Session Changed',
    'ECU confirms extended session. P2 max = 0x0050 (80ms), S3 server = 0x00FA (5000ms). Enhanced services are now available.',
    100, 'SF (6 bytes)'),
  req(['3E', '00'], [S, SF], 'TesterPresent #1',
    'Tester sends TesterPresent (sub-function 0x00 = no response suppression). This resets the S3 server timer to prevent the ECU from returning to default session. Must be sent before S3 expires.',
    4000, 'SF (2 bytes)'),
  resp(['7E', '00'], [S, SF], 'Session Kept Alive',
    'ECU responds with positive response. The S3 timer is reset to 5000ms. The tester should send the next TesterPresent well before S3 expires.',
    50, 'SF (2 bytes)'),
  req(['3E', '80'], [S, SF], 'TesterPresent #2 (Suppress)',
    'Tester sends TesterPresent with sub-function 0x80 (suppress positive response). The ECU will not respond, saving CAN bus bandwidth. The S3 timer is still reset.',
    4000, 'SF (2 bytes)'),
  resp([''], [], 'No Response (Suppressed)',
    'No response expected. Sub-function 0x80 bit (0x80) tells the ECU to suppress the positive response. This reduces CAN bus traffic during long diagnostic sessions.',
    50, 'SF (suppressed)'),
  req(['10', '01'], [S, SF], 'Return to Default Session',
    'Tester switches back to default session (0x01). All extended session services are now locked again. The ECU clears any pending operations.',
    50, 'SF (2 bytes)'),
  resp(['50', '01', '00', '32', '01', 'F4'], [S, SF, D, D, D, D], 'Default Session Set',
    'ECU confirms return to default session. P2 max = 0x0032 (50ms), S3 server = 0x01F4 (5000ms). Normal operation mode restored.',
    50, 'SF (6 bytes)'),
];

const sessionNegative: SequenceStep[] = sessionSuccess; // Same — session management rarely has negative responses

// ──────────── DTC Reading ────────────

const dtcSuccess: SequenceStep[] = [
  req(['19', '02', '09'], [S, SF, D], 'Read DTC by Status',
    'Tester requests all DTCs with status mask 0x09 (confirmed + test failed). Status bits: bit 0 = confirmed, bit 3 = test failed. This is the most common DTC read request.',
    100, 'SF (3 bytes)'),
  resp(['59', '02', 'D3', '10', '23', '01', '89', '02', '06'], [S, SF, D, D, D, D, D, D, D], 'DTC Report',
    'ECU reports DTCs. DTC count: 0xD310 = 1. First DTC: 0x010206 (P0206) with status 0x89 (confirmed + test failed + pending + confirmed since last clear). High byte 0x02 = DTC count low byte.',
    300, 'SF (9 bytes, may require FF in real scenarios)'),
  req(['14', 'FF', 'FF', 'FF'], [S, D, D, D], 'Clear DTCs',
    'Tester requests to clear all Diagnostic Trouble Codes and their freeze frame data. The group record 0xFFFFFF means "clear all DTCs". Some ECUs require security access first.',
    200, 'SF (4 bytes)'),
  resp(['54'], [S], 'DTCs Cleared',
    'ECU confirms all DTCs have been cleared. The DTC count is now zero. MIL (Malfunction Indicator Lamp) may turn off after confirmation drive cycle.',
    500, 'SF (1 byte)'),
];

const dtcNegative: SequenceStep[] = [
  req(['19', '02', '09'], [S, SF, D], 'Read DTC by Status',
    'Tester requests DTCs with status mask 0x09.',
    100, 'SF (3 bytes)'),
  negResp(['7F', '19', '21'], [S, SF, N], 'Busy Repeat Request',
    'Negative response: 0x21 = Busy Repeat Request. The ECU is currently processing another operation and cannot read DTCs. The tester should retry after a delay.',
    100),
];

// ──────────── Routine Control ────────────

const routineSuccess: SequenceStep[] = [
  req(['31', '01', 'FF', '00'], [S, SF, D, D], 'Start Routine (Erase Memory)',
    'Tester starts the eraseMemory routine (routineIdentifier 0xFF00). This typically requires prior security access. The ECU begins erasing the specified memory region.',
    500, 'SF (4 bytes)'),
  resp(['71', '01', 'FF', '00'], [S, SF, D, D], 'Routine Started',
    'ECU acknowledges the routine has started. The erase operation is now in progress. The ECU will respond to subsequent requestResults with the current status.',
    200, 'SF (4 bytes)'),
  req(['31', '03', 'FF', '00'], [S, SF, D, D], 'Request Routine Results',
    'Tester polls the routine status. Sub-function 0x03 = requestResults. The ECU returns the current state of the erase operation.',
    5000, 'SF (4 bytes)'),
  resp(['71', '03', 'FF', '00', '00'], [S, SF, D, D, D], 'Erase Complete',
    'Routine results: 0x00 = Operation completed successfully. The memory has been fully erased and is ready for data transfer. Non-zero values indicate partial completion or errors.',
    200, 'SF (5 bytes)'),
];

const routineNegative: SequenceStep[] = [
  req(['31', '01', 'FF', '00'], [S, SF, D, D], 'Start Routine (No Security)',
    'Tester tries to start eraseMemory without unlocking security access first. The ECU rejects this because eraseMemory is a protected operation.',
    500, 'SF (4 bytes)'),
  negResp(['7F', '31', '33'], [S, SF, N], 'Security Access Denied',
    'Negative response: 0x33 = Security Access Denied. The eraseMemory routine requires prior successful SecurityAccess (service 0x27). Complete the seed/key exchange first.',
    200),
];

// ──────────── Export all presets ────────────

export const SEQUENCE_PRESETS: SequencePreset[] = [
  {
    id: 'security-access',
    name: 'Security Access',
    description: 'Seed/Key exchange to unlock protected ECU services (0x27)',
    successSteps: securitySuccess,
    negativeSteps: securityNegative,
  },
  {
    id: 'data-transfer',
    name: 'Data Transfer',
    description: 'Full download sequence with multi-block transfer (0x34→0x36→0x37)',
    successSteps: transferSuccess,
    negativeSteps: transferNegative,
  },
  {
    id: 'ecu-reset',
    name: 'ECU Reset',
    description: 'Hard reset with reboot and session re-initialization (0x11)',
    successSteps: resetSuccess,
    negativeSteps: resetNegative,
  },
  {
    id: 'session-management',
    name: 'Session Management',
    description: 'Extended session with TesterPresent keep-alive (0x10+0x3E)',
    successSteps: sessionSuccess,
    negativeSteps: sessionNegative,
  },
  {
    id: 'dtc-reading',
    name: 'DTC Operations',
    description: 'Read and clear Diagnostic Trouble Codes (0x19+0x14)',
    successSteps: dtcSuccess,
    negativeSteps: dtcNegative,
  },
  {
    id: 'routine-control',
    name: 'Routine Control',
    description: 'Start/stop ECU routines like memory erase (0x31)',
    successSteps: routineSuccess,
    negativeSteps: routineNegative,
  },
];
