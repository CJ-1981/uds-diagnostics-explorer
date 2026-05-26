// UDS (Unified Diagnostic Services, ISO 14229) Command Database
// Complete reference for automotive diagnostic services

export interface UdsSubFunction {
  id: string;
  name: string;
  description: string;
}

export interface UdsNegativeResponse {
  code: string;
  name: string;
  description: string;
}

export interface UdsCommand {
  sid: string;
  name: string;
  group: string;
  description: string;
  requestFormat: string;
  responseFormat: string;
  subFunctions: UdsSubFunction[];
  negativeResponses: UdsNegativeResponse[];
  relatedServices: string[];
  usageNotes: string;
}

export interface UdsGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  commands: UdsCommand[];
}

// Common negative response codes used across services
const commonNegativeResponses: UdsNegativeResponse[] = [
  { code: "0x10", name: "General Reject", description: "The requested action was not performed due to an unspecified error." },
  { code: "0x11", name: "Service Not Supported", description: "The requested service ID is not supported by the server." },
  { code: "0x12", name: "Sub-Function Not Supported", description: "The requested sub-function is not supported by the server." },
  { code: "0x13", name: "Incorrect Message Length or Invalid Format", description: "The message length or format does not match the specification." },
  { code: "0x22", name: "Conditions Not Correct", description: "The preconditions for the requested operation are not met." },
  { code: "0x31", name: "Request Out Of Range", description: "A parameter value is outside the valid range defined for this service." },
  { code: "0x33", name: "Security Access Denied", description: "The requested operation requires security access which has not been granted." },
  { code: "0x7F", name: "Service Not Supported In Active Session", description: "The service is not supported in the current diagnostic session." },
];

const sessionNegativeResponses: UdsNegativeResponse[] = [
  ...commonNegativeResponses,
  { code: "0x14", name: "Response Too Long", description: "The response would exceed the maximum message length." },
  { code: "0x21", name: "Busy Repeat Request", description: "The server is busy; the client should repeat the request." },
  { code: "0x33", name: "Security Access Denied", description: "Security access has not been granted for this operation." },
  { code: "0x7F", name: "Service Not Supported In Active Session", description: "The service is not supported in the current diagnostic session." },
  { code: "0x81", name: "RPM Too High", description: "Engine RPM exceeds the allowed threshold." },
  { code: "0x82", name: "RPM Too Low", description: "Engine RPM is below the required threshold." },
  { code: "0x83", name: "Engine Is Running", description: "Operation requires engine to be off, but it is running." },
  { code: "0x84", name: "Engine Is Not Running", description: "Operation requires engine to be running, but it is off." },
  { code: "0x85", name: "Engine Run Time Too Low", description: "Not enough engine run time elapsed." },
  { code: "0x86", name: "Temperature Too High", description: "Engine/component temperature exceeds the allowed threshold." },
  { code: "0x87", name: "Temperature Too Low", description: "Engine/component temperature is below the required threshold." },
  { code: "0x88", name: "Vehicle Speed Too High", description: "Vehicle speed exceeds the allowed threshold." },
  { code: "0x89", name: "Vehicle Speed Too Low", description: "Vehicle speed is below the required threshold." },
  { code: "0x8A", name: "Throttle/Pedal Too High", description: "Throttle position exceeds the allowed threshold." },
  { code: "0x8B", name: "Throttle/Pedal Too Low", description: "Throttle position is below the required threshold." },
  { code: "0x8C", name: "Transmission Not In Neutral", description: "Transmission must be in neutral for this operation." },
  { code: "0x8D", name: "Transmission Not In Gear", description: "Transmission must be in gear for this operation." },
];

// GROUP 1: Session & Communication
const sessionCommands: UdsCommand[] = [
  {
    sid: "0x10",
    name: "DiagnosticSessionControl",
    group: "session",
    description:
      "Changes the diagnostic session in the ECU. Different sessions enable different sets of services. The default session (0x01) supports basic communication, while extended sessions (0x02, 0x03) unlock advanced diagnostic and programming capabilities.",
    requestFormat: "10 [sessionType]",
    responseFormat: "50 [sessionType] [sessionParameterRecord]",
    subFunctions: [
      { id: "0x01", name: "Default Session", description: "Normal vehicle operation mode. Only basic diagnostic services available." },
      { id: "0x02", name: "Programming Session", description: "Used for flashing/programming the ECU. Most diagnostic services are disabled." },
      { id: "0x03", name: "Extended Diagnostic Session", description: "Full access to all diagnostic services including memory access and I/O control." },
      { id: "0x04", name: "Safety System Diagnostic Session", description: "Session for diagnostics related to safety-critical systems (e.g., airbags, ABS)." },
    ],
    negativeResponses: sessionNegativeResponses,
    relatedServices: ["0x3E TesterPresent", "0x27 SecurityAccess", "0x11 ECUReset"],
    usageNotes:
      "After session change, the ECU resets S3 Server Timer. The client must send TesterPresent (0x3E) or other messages within the S3 timeout to maintain the session. Session 0x02 and 0x03 typically require SecurityAccess first.",
  },
  {
    sid: "0x11",
    name: "ECUReset",
    group: "session",
    description:
      "Resets the ECU. Supports hard reset (power cycle), key-off-on reset (simulates ignition cycle), and soft reset. Used to apply configuration changes or clear fault states.",
    requestFormat: "11 [resetType]",
    responseFormat: "51 [resetType]",
    subFunctions: [
      { id: "0x01", name: "Hard Reset", description: "Full power cycle equivalent to battery disconnect. All RAM is cleared." },
      { id: "0x02", name: "Key Off On Reset", description: "Simulates ignition key off then on. Similar to a normal vehicle restart." },
      { id: "0x03", name: "Soft Reset", description: "Resets the ECU without removing power. Fastest reset type, preserves some RAM." },
      { id: "0x04", name: "Enable Rapid Power Shutdown", description: "Prepares the ECU for immediate power loss. Used before battery disconnect." },
      { id: "0x05", name: "Disable Rapid Power Shutdown", description: "Cancels the rapid power shutdown preparation." },
    ],
    negativeResponses: sessionNegativeResponses,
    relatedServices: ["0x10 DiagnosticSessionControl", "0x27 SecurityAccess", "0x3E TesterPresent"],
    usageNotes:
      "After reset, communication may be temporarily unavailable. The tester should wait for the ECU to complete initialization before resuming communication. Hard reset requires the longest recovery time.",
  },
  {
    sid: "0x27",
    name: "SecurityAccess",
    group: "session",
    description:
      "Provides security unlock mechanism for protected services (e.g., programming, writing configuration data). Uses a seed-and-key challenge-response protocol. Some ECUs require multiple security levels.",
    requestFormat: "27 [securityAccessType] [securityData]",
    responseFormat: "67 [securityAccessType] [securitySeed]",
    subFunctions: [
      { id: "0x01", name: "Request Seed (Level 1)", description: "Request security seed for first-level access. Used before programming or critical writes." },
      { id: "0x02", name: "Send Key (Level 1)", description: "Send computed key to unlock first-level access." },
      { id: "0x03", name: "Request Seed (Level 2)", description: "Request security seed for second-level access. Higher security clearance." },
      { id: "0x04", name: "Send Key (Level 2)", description: "Send computed key to unlock second-level access." },
      { id: "0x05", name: "Request Seed (Level 3)", description: "Request security seed for third-level access." },
      { id: "0x06", name: "Send Key (Level 3)", description: "Send computed key to unlock third-level access." },
      { id: "0x11", name: "Request Seed (Linked)", description: "Request seed for security level linked to previous session." },
      { id: "0x12", name: "Send Key (Linked)", description: "Send key for linked security level." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Preconditions for security access are not met." },
      { code: "0x35", name: "Invalid Key", description: "The key sent does not match the expected key for the given seed." },
      { code: "0x36", name: "Exceeds Number Of Attempts", description: "Too many failed attempts. Security access is temporarily locked." },
      { code: "0x37", name: "Required Time Delay Not Expired", description: "Must wait before next security attempt." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Security access not available in current session." },
    ],
    relatedServices: ["0x10 DiagnosticSessionControl", "0x2E WriteDataByIdentifier", "0x11 ECUReset", "0x34 RequestDownload"],
    usageNotes:
      "After a successful key exchange, the ECU remains unlocked for a defined time (S3 timer). If the timer expires, the seed must be requested again. Some ECUs use a fixed key algorithm; others use OEM-specific cryptographic functions. Exceeding the attempt limit may require an ECU reset or ignition cycle.",
  },
  {
    sid: "0x28",
    name: "CommunicationControl",
    group: "session",
    description:
      "Controls the ECU's ability to receive and transmit messages on the bus network. Used to silence an ECU during programming or to restore normal communication behavior.",
    requestFormat: "28 [controlType] [communicationType]",
    responseFormat: "68 [controlType] [communicationType]",
    subFunctions: [
      { id: "0x00", name: "Enable Rx and Tx", description: "Enable both reception and transmission of all messages." },
      { id: "0x01", name: "Enable Rx and Disable Tx", description: "Receive messages but do not transmit. Used during programming." },
      { id: "0x02", name: "Disable Rx and Enable Tx", description: "Transmit messages but do not receive. Rarely used." },
      { id: "0x03", name: "Disable Rx and Tx", description: "Disable both reception and transmission. Complete isolation." },
      { id: "0x04", name: "Enable Rx and Tx with Enhanced Addressing", description: "Enable communication with enhanced addressing mode." },
      { id: "0x05", name: "Enable Rx and Disable Tx with Enhanced Addressing", description: "Enhanced addressing with Tx disabled." },
    ],
    negativeResponses: sessionNegativeResponses,
    relatedServices: ["0x10 DiagnosticSessionControl", "0x3E TesterPresent", "0x85 ResponseOnEvent"],
    usageNotes:
      "The communicationType parameter specifies which types of messages are affected (e.g., application messages, network management, or all messages). Communication control is often used during programming sessions to prevent the ECU from interfering with flash operations.",
  },
  {
    sid: "0x29",
    name: "Authentication",
    group: "session",
    description:
      "Authenticates the diagnostic tester to the ECU using challenge-response mechanisms. Supports various authentication methods including certificate-based authentication (ISO 29184).",
    requestFormat: "29 [authenticationModeType] [authenticationParameter]",
    responseFormat: "69 [authenticationModeType] [authenticationParameter]",
    subFunctions: [
      { id: "0x01", name: "Verify Challenge (UdsChallenge)", description: "ECU sends a challenge, tester computes and sends the response." },
      { id: "0x02", name: "Verify Response (UdsResponse)", description: "Tester sends the computed response to the ECU's challenge." },
      { id: "0x03", name: "Verify Protection (UdsProtection)", description: "Verification of protection status." },
      { id: "0x04", name: "Request Authentication Status", description: "Query current authentication status of the ECU." },
      { id: "0x05", name: "Verify Proof Of Ownership (UdsPoP)", description: "Certificate-based proof of ownership verification." },
      { id: "0x06", name: "Transmit Proof Of Ownership", description: "Send proof of ownership certificate to ECU." },
      { id: "0x07", name: "Verify Authentication Signature (UdsAS)", description: "Verify digital signature for authentication." },
      { id: "0x08", name: "Transmit Authentication Signature", description: "Send authentication signature to ECU." },
    ],
    negativeResponses: sessionNegativeResponses,
    relatedServices: ["0x27 SecurityAccess", "0x10 DiagnosticSessionControl"],
    usageNotes:
      "Authentication (0x29) provides a more advanced and secure alternative to SecurityAccess (0x27). It supports certificate-based mechanisms defined in ISO 29184. Used primarily in modern vehicles with enhanced security requirements.",
  },
  {
    sid: "0x3E",
    name: "TesterPresent",
    group: "session",
    description:
      "Keeps the diagnostic session alive by resetting the S3 Server Timer. Must be sent periodically to prevent the ECU from automatically returning to the default session. Supports zero-sub-function for minimal overhead.",
    requestFormat: "3E 00",
    responseFormat: "7E 00",
    subFunctions: [
      { id: "0x00", name: "Zero Sub-Function (No Response Required)", description: "Normal TesterPresent with suppression of positive response indicator. ECU may still respond." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x10 DiagnosticSessionControl", "0x28 CommunicationControl"],
    usageNotes:
      "The S3 Server Timer typically has a timeout of 5000ms (default session) or 2000ms (non-default session). TesterPresent should be sent at intervals shorter than S3/2 to ensure reliable session maintenance. The 0x00 sub-function is the most commonly used format. SuppressPosRspMsgIndicationBit (bit 7 of sub-function) can be set to suppress positive responses and reduce bus load.",
  },
  {
    sid: "0x84",
    name: "ControlDTCSetting",
    group: "session",
    description:
      "Enables or disables DTC recording in the ECU. Used to prevent false DTCs during programming or testing operations where sensors may be disconnected or signals may be invalid.",
    requestFormat: "84 [DTCSettingType] [DTCSettingControlOptionRecord]",
    responseFormat: "C4 [DTCSettingType]",
    subFunctions: [
      { id: "0x01", name: "DTC Setting On", description: "Resume normal DTC recording. All detected faults will be recorded." },
      { id: "0x02", name: "DTC Setting Off", description: "Stop DTC recording. Faults detected during this time will not be stored." },
    ],
    negativeResponses: sessionNegativeResponses,
    relatedServices: ["0x14 ClearDiagnosticInformation", "0x19 ReadDTCInformation", "0x10 DiagnosticSessionControl"],
    usageNotes:
      "Always disable DTCs before performing operations that may generate false fault codes (e.g., sensor disconnection, programming). Remember to re-enable DTC recording after the operation is complete. Some ECUs automatically disable DTCs when entering programming session.",
  },
  {
    sid: "0x85",
    name: "ResponseOnEvent",
    group: "session",
    description:
      "Configures the ECU to automatically transmit response messages when specific events occur (e.g., threshold exceeded, timer expired, value changed). Used for monitoring without continuous polling.",
    requestFormat: "85 [eventWindowTime] [eventTypeRecord]",
    responseFormat: "C5 [eventTypeRecord]",
    subFunctions: [
      { id: "0x00", name: "Stop Response On Event", description: "Cancel all active ResponseOnEvent configurations." },
      { id: "0x01", name: "DTC Status Change", description: "Report when DTC status changes (new DTC, DTC cleared, etc.)." },
      { id: "0x02", name: "Timer Interrupt", description: "Periodic reporting at specified time intervals." },
      { id: "0x03", name: "Changed Value", description: "Report when a specific data identifier changes value." },
      { id: "0x04", name: "Value Above Threshold", description: "Report when a monitored value exceeds the upper threshold." },
      { id: "0x05", name: "Value Below Threshold", description: "Report when a monitored value falls below the lower threshold." },
      { id: "0x06", name: "Value Out Of Range", description: "Report when a value is outside defined upper/lower bounds." },
      { id: "0x07", name: "Comparison With Outside Value", description: "Compare external value with internal ECU value." },
      { id: "0x08", name: "Comparison With Internal Value", description: "Compare two internal ECU values." },
      { id: "0x09", name: "Inserted Ignition Key", description: "Report when an ignition key is inserted." },
      { id: "0x0A", name: "Removed Ignition Key", description: "Report when an ignition key is removed." },
      { id: "0x0B", name: "Clock Time Reached", description: "Report when a specific clock time is reached." },
    ],
    negativeResponses: sessionNegativeResponses,
    relatedServices: ["0x22 ReadDataByIdentifier", "0x2A ReadScalingDataByIdentifier", "0x28 CommunicationControl"],
    usageNotes:
      "The eventWindowTime parameter defines how long the ECU should keep reporting events after the initial trigger. Each event type has a specific record format defining what to monitor and the thresholds. Multiple events can be configured simultaneously depending on ECU capabilities.",
  },
];

// GROUP 2: Data Access
const dataAccessCommands: UdsCommand[] = [
  {
    sid: "0x14",
    name: "ClearDiagnosticInformation",
    group: "data",
    description:
      "Clears diagnostic trouble codes (DTCs) from the ECU memory. Can clear all DTCs or a specific group. The ECU verifies that conditions are correct before performing the clear operation.",
    requestFormat: "14 [groupOfDTC] (3 bytes, FFFFFFFF = all)",
    responseFormat: "54",
    subFunctions: [
      { id: "0xFFFFFF", name: "Clear All DTCs", description: "Clears all stored diagnostic trouble codes and freeze frame data." },
      { id: "0x000001", name: "Clear Powertrain DTCs", description: "Clears only powertrain-related diagnostic codes." },
      { id: "0x000002", name: "Clear Chassis DTCs", description: "Clears only chassis-related diagnostic codes." },
      { id: "0x000003", name: "Clear Body DTCs", description: "Clears only body-related diagnostic codes." },
      { id: "0x000004", name: "Clear Network/Communication DTCs", description: "Clears communication-related diagnostic codes." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Cannot clear DTCs because preconditions are not met (e.g., engine running, DTC active)." },
      { code: "0x31", name: "Request Out Of Range", description: "The groupOfDTC parameter is invalid." },
      { code: "0x33", name: "Security Access Denied", description: "Security access required but not granted." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Clear DTC not available in current session." },
    ],
    relatedServices: ["0x19 ReadDTCInformation", "0x84 ControlDTCSetting", "0x10 DiagnosticSessionControl"],
    usageNotes:
      "Common practice is to first read all DTCs (0x19), note them down, then clear them. After clearing, perform a driving cycle and read DTCs again to check for recurring faults. Some ECUs require the engine to be off and key on to clear DTCs. The groupOfDTC uses the same UDS-defined functional groups as DTC reporting.",
  },
  {
    sid: "0x18",
    name: "ReadDTCInformation",
    group: "data",
    description:
      "Reads diagnostic trouble codes and related information from the ECU. Supports various report types including DTC count, DTCs by status mask, snapshot data, extended data records, and DTC severity information.",
    requestFormat: "18 [reportType] [DTCStatusMask] [DTC] [recordNumber] [dataRecord]",
    responseFormat: "58 [reportType] [DTCAndStatusRecord] / [dataRecord]",
    subFunctions: [
      { id: "0x01", name: "Report Number Of DTCs By Status Mask", description: "Returns the count of DTCs matching the given status mask." },
      { id: "0x02", name: "Report DTCs By Status Mask", description: "Returns all DTCs and their status that match the given status mask." },
      { id: "0x03", name: "Report DTC Snapshot Identification", description: "Returns the DTC snapshot record numbers available for each DTC." },
      { id: "0x04", name: "Report DTC Snapshot Record By DTC Number", description: "Returns the snapshot data for a specific DTC." },
      { id: "0x05", name: "Report DTC Extended Data Record By DTC Number", description: "Returns extended data for a specific DTC." },
      { id: "0x06", name: "Report Mirror Memory DTCs By Status Mask", description: "Reads DTCs from the mirror memory (startup copy)." },
      { id: "0x07", name: "Report Mirror Memory DTC Extended Data Record By DTC Number", description: "Extended data from mirror memory for a specific DTC." },
      { id: "0x0A", name: "Report DTC Extended Data Record By Record Number", description: "Returns all DTCs with a specific extended data record number." },
      { id: "0x0B", name: "Report DTCs With Severity Information", description: "Returns DTCs with their severity and aging information." },
      { id: "0x0C", name: "Report Supported DTCs (Obd)", description: "Returns all supported DTCs (OBD-II compatible)." },
      { id: "0x0D", name: "Report First Test Failed DTC", description: "Returns the DTC that failed the most recent test." },
      { id: "0x0E", name: "Report First Confirmed DTC", description: "Returns the first confirmed DTC." },
      { id: "0x0F", name: "Report Most Recent Test Failed DTC", description: "Returns the most recent DTC that failed testing." },
      { id: "0x10", name: "Report Most Recent Confirmed DTC", description: "Returns the most recently confirmed DTC." },
      { id: "0x11", name: "Report DTC With Permanent Status", description: "Returns DTCs that cannot be cleared by the tester." },
      { id: "0x12", name: "Report DTCs By Occurrence Counter", description: "Returns DTCs sorted by occurrence count." },
      { id: "0x13", name: "Report DTCs By Aging Counter", description: "Returns DTCs sorted by aging counter." },
      { id: "0x14", name: "Report DTCs By Operational State", description: "Returns DTCs based on the ECU operational state." },
      { id: "0x15", name: "Report User Memory DTCs By Status Mask", description: "Returns user-defined memory DTCs." },
      { id: "0x42", name: "Report DTC Fault Detection Counter", description: "Returns the fault detection counter for each DTC." },
      { id: "0x46", name: "Report DTC Extended Data By Record Number", description: "Returns extended data records for a specific record number." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x14 ClearDiagnosticInformation", "0x19 ReadDTCInformation", "0x84 ControlDTCSetting"],
    usageNotes:
      "The DTCStatusMask is a bitmap where each bit represents a DTC status (bit 0=testFailed, bit 1=testFailedThisOperationCycle, bit 2=confirmedDTC, bit 3=confirmedDTCThisOperationCycle, bit 4=pendingDTC, etc.). Use 0xFF to match all statuses. Snapshot data contains the captured values at the moment a DTC was stored.",
  },
  {
    sid: "0x1A",
    name: "ReadDataByPeriodicIdentifier",
    group: "data",
    description:
      "Reads data from the ECU that has been predefined for periodic transmission. The data is identified by a periodic identifier and sent at fixed intervals without requiring individual requests for each data point.",
    requestFormat: "1A [transmissionMode] [periodicIdentifier_1] [periodicIdentifier_2] ...",
    responseFormat: "5A [transmissionMode] [periodicIdentifier] [dataRecord]",
    subFunctions: [
      { id: "0x01", name: "Stop Periodic Transmission", description: "Stop all periodic data transmission." },
      { id: "0x02", name: "Start Periodic Transmission", description: "Start sending data for specified identifiers at their defined intervals." },
      { id: "0x03", name: "Modify Periodic Transmission", description: "Modify the list of identifiers or their transmission parameters." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x22 ReadDataByIdentifier", "0x2A ReadScalingDataByIdentifier", "0x69 ReadDataByPeriodicIdentifier(Extended)"],
    usageNotes:
      "This service is useful for streaming data such as engine speed, temperature, and other dynamic parameters. The periodic identifiers and their corresponding data definitions are ECU-specific. The transmissionMode controls how the data is sent.",
  },
  {
    sid: "0x22",
    name: "ReadDataByIdentifier",
    group: "data",
    description:
      "Reads data from the ECU identified by a Data Identifier (DID). This is the most commonly used UDS service for reading diagnostic data, VIN, calibration data, live data, and configuration parameters.",
    requestFormat: "22 [DID_1] [DID_2] ...",
    responseFormat: "62 [DID] [dataRecord]",
    subFunctions: [
      { id: "0xF180", name: "Vehicle Identification Number (VIN)", description: "17-character world manufacturer identifier. Read-only standardized DID." },
      { id: "0xF189", name: "ECU Hardware Number", description: "Hardware part number of the ECU." },
      { id: "0xF18A", name: "ECU Software Number", description: "Software version number of the ECU." },
      { id: "0xF18B", name: "ECU Software Version Number", description: "Detailed software version including build number." },
      { id: "0xF18C", name: "Application Software Identification", description: "Application software identification string." },
      { id: "0xF18D", name: "Boot Software Identification", description: "Boot software identification string." },
      { id: "0xF18E", name: "Software Version Number (Calibration)", description: "Calibration data software version." },
      { id: "0xF19A", name: "Diagnostic Session Record", description: "Current diagnostic session and timing parameters." },
      { id: "0xF19B", name: "Supplier ECU Software Number", description: "Supplier-specific software number." },
      { id: "0xF195", name: "System Supplier Identifier", description: "Identification of the ECU system supplier." },
      { id: "0xF196", name: "ECU Manufacturing Date", description: "Date the ECU was manufactured (YYMMDD format)." },
      { id: "0xF197", name: "ECU Serial Number", description: "Serial number of the ECU." },
      { id: "0xF198", name: "Supported Diagnostic Services", description: "Bit-mapped list of supported UDS services." },
      { id: "0xF199", name: "Implementation ID", description: "ECU implementation identification." },
      { id: "0x0100", name: "Engine Speed (RPM)", description: "Current engine speed in revolutions per minute." },
      { id: "0x0101", name: "Engine Load", description: "Current calculated engine load percentage." },
      { id: "0x0102", name: "Coolant Temperature", description: "Engine coolant temperature in degrees Celsius." },
      { id: "0x0103", name: "Intake Air Temperature", description: "Temperature of intake air in degrees Celsius." },
      { id: "0x0104", name: "Mass Air Flow", description: "Mass air flow rate in grams per second." },
      { id: "0x0105", name: "Throttle Position", description: "Throttle valve opening angle percentage." },
      { id: "0x0106", name: "Battery Voltage", description: "Current battery/terminal voltage." },
      { id: "0x0107", name: "Vehicle Speed", description: "Current vehicle speed in km/h." },
      { id: "0x0108", name: "Engine Oil Temperature", description: "Engine oil temperature in degrees Celsius." },
      { id: "0x0109", name: "Fuel Pressure", description: "Fuel rail pressure in kPa." },
      { id: "0x010A", name: "Odometer", description: "Total vehicle distance traveled in km." },
      { id: "0x0130", name: "Ambient Temperature", description: "External ambient air temperature." },
      { id: "0x0140", name: "Barometric Pressure", description: "Atmospheric pressure in kPa." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x2E WriteDataByIdentifier", "0x2A ReadScalingDataByIdentifier", "0x2C DynamicallyDefineDataIdentifier"],
    usageNotes:
      "Multiple DIDs can be read in a single request. Standard DIDs (0xF180-0xF1FF) are defined by UDS/ISO standards. Manufacturer-specific DIDs use the range 0x0000-0x00FF and 0x0200-0xFEFF. If the ECU does not support a requested DID, it returns negative response 0x31.",
  },
  {
    sid: "0x23",
    name: "ReadMemoryByAddress",
    group: "data",
    description:
      "Reads data from a specific memory address and memory size in the ECU. Used for low-level memory access to inspect calibration data, configuration parameters, or firmware contents. Often requires security access.",
    requestFormat: "23 [memoryAddress] [memorySize]",
    responseFormat: "63 [memoryAddress] [dataRecord]",
    subFunctions: [
      { id: "address_size", name: "Address + Size Format", description: "Address format and size format defined by the ECU (e.g., 4-byte address, 2-byte size). Addressing is always in bytes." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Cannot read memory in current state (e.g., during programming)." },
      { code: "0x33", name: "Security Access Denied", description: "Security access required for the requested memory region." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Memory read not available in current session." },
    ],
    relatedServices: ["0x3D WriteMemoryByAddress", "0x24 ReadScalingDataByLocalIdentifier", "0x27 SecurityAccess"],
    usageNotes:
      "The memory address and size formats are defined in the ECU's data link layer. Common format: 4-byte address (big-endian) + 2-byte size. Memory access may be restricted to specific regions or require elevated diagnostic sessions. Use carefully — incorrect memory addresses may cause undefined behavior.",
  },
  {
    sid: "0x2A",
    name: "ReadScalingDataByIdentifier",
    group: "data",
    description:
      "Reads scaling information for a specific Data Identifier. Returns the unit, offset, and factor needed to convert raw data values into physical engineering units (e.g., converting a raw byte value to Celsius).",
    requestFormat: "2A [DID]",
    responseFormat: "6A [DID] [scalingInfoRecord]",
    subFunctions: [
      { id: "0x0100", name: "Engine Speed Scaling", description: "Scaling data for engine speed (RPM) conversion." },
      { id: "0x0102", name: "Coolant Temperature Scaling", description: "Scaling data for coolant temperature (°C) conversion." },
      { id: "0x0104", name: "Mass Air Flow Scaling", description: "Scaling data for MAF sensor (g/s) conversion." },
      { id: "0x0105", name: "Throttle Position Scaling", description: "Scaling data for throttle position (%) conversion." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x22 ReadDataByIdentifier", "0x2C DynamicallyDefineDataIdentifier", "0x24 ReadScalingDataByLocalIdentifier"],
    usageNotes:
      "Scaling data follows a fixed-point format: physical_value = (raw_value × factor) + offset. The response contains a structured record defining the data type, minimum/maximum values, unit text, and byte order. This service is essential for interpreting raw ECU data correctly.",
  },
  {
    sid: "0x2C",
    name: "DynamicallyDefineDataIdentifier",
    group: "data",
    description:
      "Creates a virtual Data Identifier (DID) by combining data from multiple existing DIDs or memory addresses. This allows reading a custom set of data in a single request, optimizing communication efficiency.",
    requestFormat: "2C [definitionMode] [dynamicDid] [definitionSource]",
    responseFormat: "6C [dynamicDid]",
    subFunctions: [
      { id: "0x01", name: "Define By DID", description: "Create dynamic DID from a list of existing DIDs." },
      { id: "0x02", name: "Define By Memory Address", description: "Create dynamic DID by specifying memory addresses and sizes." },
      { id: "0x03", name: "Clear Dynamic DID", description: "Remove a previously defined dynamic DID." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x22 ReadDataByIdentifier", "0x23 ReadMemoryByAddress", "0x2A ReadScalingDataByIdentifier"],
    usageNotes:
      "Once defined, the dynamic DID can be read using service 0x22 like any standard DID. This is very useful for creating optimized data sets for logging or monitoring. The number of dynamic DIDs that can be defined simultaneously depends on the ECU.",
  },
  {
    sid: "0x2E",
    name: "WriteDataByIdentifier",
    group: "data",
    description:
      "Writes data to the ECU identified by a Data Identifier (DID). Used for programming configuration parameters, calibration values, adaptation values, and other writable data. Often requires security access.",
    requestFormat: "2E [DID] [dataRecord]",
    responseFormat: "6E [DID]",
    subFunctions: [
      { id: "0xF180", name: "Write VIN (if supported)", description: "Write Vehicle Identification Number (rarely writable)." },
      { id: "0xF18B", name: "Write Software Version", description: "Update software version number after programming." },
      { id: "0xF196", name: "Write Manufacturing Date", description: "Set manufacturing date for replacement ECU." },
      { id: "0xF197", name: "Write ECU Serial Number", description: "Program ECU serial number for replacement unit." },
      { id: "0xF19B", name: "Write Supplier SW Number", description: "Update supplier-specific software identification." },
      { id: "0xF1A0", name: "Write End-of-Line Data", description: "Write end-of-line programming data." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Write conditions not met (e.g., engine running)." },
      { code: "0x33", name: "Security Access Denied", description: "Security access required but not granted." },
      { code: "0x7E", name: "Sub-Function Not Supported In Active Session", description: "Write operation not available in current session." },
    ],
    relatedServices: ["0x22 ReadDataByIdentifier", "0x27 SecurityAccess", "0x10 DiagnosticSessionControl"],
    usageNotes:
      "Always read the current value first before writing. Writing incorrect values may cause the ECU to malfunction. Most configuration DIDs require extended diagnostic session and security access. After writing, verify the value by reading it back.",
  },
  {
    sid: "0x55",
    name: "WriteMemoryByAddress",
    group: "data",
    description:
      "Writes data to a specific memory address in the ECU. Used for low-level memory programming, typically during flash programming sequences. Always requires security access and proper session mode.",
    requestFormat: "55 [memoryAddress] [memorySize] [dataRecord]",
    responseFormat: "75 [memoryAddress] [memorySize]",
    subFunctions: [
      { id: "address_size", name: "Address + Size + Data Format", description: "Address format and data format defined by the ECU. Addressing is always in bytes." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Cannot write to memory in current state." },
      { code: "0x33", name: "Security Access Denied", description: "Security access required for memory write." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Memory write not available in current session." },
    ],
    relatedServices: ["0x23 ReadMemoryByAddress", "0x34 RequestDownload", "0x36 TransferData", "0x27 SecurityAccess"],
    usageNotes:
      "This service is typically used for writing small amounts of data to specific memory locations. For large data transfers (firmware flashing), use the RequestDownload/TransferData/RequestTransferExit sequence (0x34/0x36/0x37) instead. Memory alignment and size restrictions may apply.",
  },
];

// GROUP 3: Input/Output Control
const ioControlCommands: UdsCommand[] = [
  {
    sid: "0x2F",
    name: "InputOutputControlByIdentifier",
    group: "io",
    description:
      "Controls and monitors input/output parameters of the ECU. Can set actuator positions, simulate sensor inputs, and read current I/O values. Essential for actuator testing and diagnostics.",
    requestFormat: "2F [DID] [controlParameter] [controlState] [values...]",
    responseFormat: "6F [DID] [controlState] [values...]",
    subFunctions: [
      { id: "0x00", name: "Return Control To ECU", description: "Stop override and return I/O control to the ECU." },
      { id: "0x01", name: "Reset To Default", description: "Reset the I/O parameter to its default value." },
      { id: "0x02", name: "Freeze Current State", description: "Freeze the I/O at its current value." },
      { id: "0x03", name: "Short Term Adjustment", description: "Temporarily adjust the I/O value for testing." },
      { id: "0x04", name: "Long Term Adjustment", description: "Permanently adjust the I/O calibration value." },
      { id: "0x05", name: "Resume Routing / Normal Operation", description: "Resume normal signal routing." },
      { id: "0x06", name: "Override Routing", description: "Override the normal signal routing." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Cannot control I/O in current operating state." },
      { code: "0x33", name: "Security Access Denied", description: "Security access required for I/O control." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "I/O control not available in current session." },
    ],
    relatedServices: ["0x22 ReadDataByIdentifier", "0x31 RoutineControl", "0x10 DiagnosticSessionControl"],
    usageNotes:
      "This service is commonly used for actuator testing (e.g., cycling relays, moving throttle, activating fuel injectors). The controlParameter separates the control action from the data. Values are ECU-specific. Always use extreme caution when controlling actuators on a running engine.",
  },
  {
    sid: "0x31",
    name: "RoutineControl",
    group: "io",
    description:
      "Starts, stops, or requests results of diagnostic routines in the ECU. Routines can perform self-tests, erase memory, calibrate sensors, and execute various diagnostic procedures.",
    requestFormat: "31 [routineIdentifier] [routineControlType] [routineOptionRecord]",
    responseFormat: "71 [routineIdentifier] [routineControlType] [routineStatusRecord]",
    subFunctions: [
      { id: "0x01", name: "Start Routine", description: "Begin execution of a diagnostic routine." },
      { id: "0x02", name: "Stop Routine", description: "Stop a currently executing routine." },
      { id: "0x03", name: "Request Routine Results", description: "Request the results of a previously completed routine." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Routine cannot be executed in current conditions." },
      { code: "0x33", name: "Security Access Denied", description: "Security access required for this routine." },
      { code: "0x94", name: "Response Pending", description: "Routine is still executing. Retry later." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Routine not available in current session." },
    ],
    relatedServices: ["0x2F InputOutputControlByIdentifier", "0x22 ReadDataByIdentifier", "0x34 RequestDownload"],
    usageNotes:
      "Common routine identifiers include: erase memory (0xFF00), reset ECU (0x0200), read VIN from EEPROM (0xE300). Some routines execute quickly (<50ms), while others may take several seconds. If the routine takes time, the ECU responds with NRC 0x94 (response pending), and the tester should retry until a final response is received.",
  },
  {
    sid: "0x34",
    name: "RequestDownload",
    group: "io",
    description:
      "Initiates a data transfer from the tester to the ECU (download). Used as the first step in the flash programming sequence. The ECU prepares its memory for receiving data and confirms the transfer parameters.",
    requestFormat: "34 [dataFormatIdentifier] [addressAndLengthFormatIdentifier] [memoryAddress] [memorySize]",
    responseFormat: "74 [lengthFormatIdentifier] [maxNumberOfBlockLength]",
    subFunctions: [
      { id: "0x00", name: "Data Compression Method (No Compression)", description: "Uncompressed data transfer. Data is written directly to memory." },
      { id: "0x01", name: "Data Encryption Method", description: "Encrypted data transfer for secure programming." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "ECU not ready for download (e.g., wrong session)." },
      { code: "0x33", name: "Security Access Denied", description: "Programming requires security access." },
      { code: "0x70", name: "Download Not Accepted", description: "ECU rejected the download request (e.g., wrong address range)." },
      { code: "0x71", name: "Upload Not Accepted", description: "Upload feature not available." },
      { code: "0x72", name: "Transfer Data Suspended", description: "Transfer cannot proceed (e.g., system error)." },
      { code: "0x73", name: "General Programming Failure", description: "A general error occurred during programming." },
      { code: "0x74", name: "Wrong Block Sequence Counter", description: "Block sequence counter mismatch." },
      { code: "0x75", name: "Request Correctly Received - Response Pending", description: "ECU is preparing, retry later." },
      { code: "0x76", name: "Conditions Not Correct - No Flash Programming Active", description: "No active flash programming session." },
      { code: "0x77", name: "Application Error", description: "Application rejected the programming operation." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Download not available in current session." },
    ],
    relatedServices: ["0x36 TransferData", "0x37 RequestTransferExit", "0x35 RequestUpload", "0x31 RoutineControl"],
    usageNotes:
      "This is step 1 of the programming sequence: RequestDownload → TransferData → RequestTransferExit. The ECU responds with the maximum block length it can accept per TransferData message. Always check the maxNumberOfBlockLength to optimize the block size. The address and length format identifiers define how many bytes are used for the address and size fields.",
  },
  {
    sid: "0x36",
    name: "TransferData",
    group: "io",
    description:
      "Transfers data blocks between the tester and ECU as part of a download or upload operation. Each block contains a sequence counter for flow control and integrity verification.",
    requestFormat: "36 [blockSequenceCounter] [transferRequestParameterRecord]",
    responseFormat: "76 [blockSequenceCounter]",
    subFunctions: [
      { id: "0x00-0xFF", name: "Block Sequence Counter", description: "Incrementing counter for each data block. Starts at 0x01 (0x00 used for first block in some implementations). Wraps around at 0xFF." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x70", name: "Download Not Accepted", description: "Data block rejected by ECU." },
      { code: "0x71", name: "Upload Not Accepted", description: "Upload data not available." },
      { code: "0x72", name: "Transfer Data Suspended", description: "Transfer suspended, may be resumed." },
      { code: "0x73", name: "General Programming Failure", description: "Programming error during data transfer." },
      { code: "0x74", name: "Wrong Block Sequence Counter", description: "Expected sequence counter does not match." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Transfer not available in current session." },
    ],
    relatedServices: ["0x34 RequestDownload", "0x35 RequestUpload", "0x37 RequestTransferExit"],
    usageNotes:
      "The block size must not exceed maxNumberOfBlockLength from the RequestDownload response. The sequence counter must increment by 1 for each consecutive block. If the ECU returns NRC 0x74 (wrong sequence counter), the transfer must be restarted from RequestDownload.",
  },
  {
    sid: "0x37",
    name: "RequestTransferExit",
    group: "io",
    description:
      "Terminates the data transfer phase and signals the ECU to process the received data. After this step, the ECU typically verifies the data integrity and applies the new software or data.",
    requestFormat: "37 [transferRequestParameterRecord]",
    responseFormat: "77 [transferRequestParameterRecord]",
    subFunctions: [],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x70", name: "Download Not Accepted", description: "Transfer exit rejected." },
      { code: "0x71", name: "Upload Not Accepted", description: "Upload exit rejected." },
      { code: "0x72", name: "Transfer Data Suspended", description: "Cannot exit transfer, data incomplete." },
      { code: "0x73", name: "General Programming Failure", description: "Error during transfer exit processing." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Exit not available in current session." },
    ],
    relatedServices: ["0x34 RequestDownload", "0x36 TransferData", "0x31 RoutineControl", "0x11 ECUReset"],
    usageNotes:
      "This is the final step of the download/upload sequence. After a successful transfer exit, the ECU verifies the transferred data (checksum verification), writes it to flash memory, and may perform integrity checks. The ECU may need to be reset (0x11) to apply the new firmware. Some ECUs perform a verification routine automatically.",
  },
];

// GROUP 4: Memory & Programming
const memoryCommands: UdsCommand[] = [
  {
    sid: "0x35",
    name: "RequestUpload",
    group: "memory",
    description:
      "Initiates a data transfer from the ECU to the tester (upload/backup). Used to read back firmware, calibration data, or configuration data from the ECU for backup or analysis purposes.",
    requestFormat: "35 [dataFormatIdentifier] [addressAndLengthFormatIdentifier] [memoryAddress] [memorySize]",
    responseFormat: "75 [lengthFormatIdentifier] [maxNumberOfBlockLength]",
    subFunctions: [
      { id: "0x00", name: "No Compression / No Encryption", description: "Raw data upload without compression or encryption." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x70", name: "Download Not Accepted", description: "Upload was rejected." },
      { code: "0x71", name: "Upload Not Accepted", description: "Upload request not accepted." },
      { code: "0x72", name: "Transfer Data Suspended", description: "Transfer suspended." },
      { code: "0x73", name: "General Programming Failure", description: "Programming error during upload setup." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Upload not available in current session." },
    ],
    relatedServices: ["0x34 RequestDownload", "0x36 TransferData", "0x37 RequestTransferExit"],
    usageNotes:
      "Upload is the reverse of download. The ECU sends data blocks to the tester via TransferData responses. Used for firmware backup, reading calibration data, or debugging. The max block length response tells the tester how much data to request per block.",
  },
  {
    sid: "0x50",
    name: "DiagnosticSessionControl (Alternative SID - Programming Context)",
    group: "memory",
    description:
      "Context-specific diagnostic session control for programming operations. In some older implementations or custom protocols, 0x50 is used as a response SID for session control operations related to programming workflows.",
    requestFormat: "50 [programmingSubFunction]",
    responseFormat: "70 [programmingSubFunction] [dataRecord]",
    subFunctions: [
      { id: "0x01", name: "Pre-Programming", description: "Prepare ECU for programming, backup critical data." },
      { id: "0x02", name: "Programming Active", description: "ECU is in active programming mode." },
      { id: "0x03", name: "Post-Programming Verification", description: "Verify programming results, restore data." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x10 DiagnosticSessionControl", "0x34 RequestDownload", "0x11 ECUReset"],
    usageNotes:
      "Note: In standard UDS, 0x50 is the response SID for service 0x10. Some OEM-specific implementations repurpose certain SIDs for programming-specific operations. Always consult the OEM diagnostic specification.",
  },
  {
    sid: "0x52",
    name: "RequestDownload (Memory Context)",
    group: "memory",
    description:
      "Memory-specific download initiation for flash programming. Prepares the ECU's flash memory for receiving new firmware data. Includes erase verification and flash preparation routines.",
    requestFormat: "52 [dataFormatIdentifier] [addressAndLengthFormatIdentifier] [memoryAddress] [memorySize]",
    responseFormat: "72 [lengthFormatIdentifier] [maxNumberOfBlockLength]",
    subFunctions: [
      { id: "0x01", name: "Flash Erase Before Download", description: "Automatically erase flash sectors before writing new data." },
      { id: "0x02", name: "Verify Before Download", description: "Verify existing data before overwriting." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x70", name: "Download Not Accepted", description: "Memory download rejected." },
      { code: "0x73", name: "General Programming Failure", description: "Flash preparation failed." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Not available in current session." },
    ],
    relatedServices: ["0x34 RequestDownload", "0x36 TransferData", "0x37 RequestTransferExit", "0x31 RoutineControl"],
    usageNotes:
      "The flash memory erase operation can take significant time (seconds to minutes depending on memory size). Some ECUs erase the entire flash, while others support sector-level erase. Always ensure the correct address range is specified to avoid erasing critical data.",
  },
  {
    sid: "0x53",
    name: "RequestUpload (Memory Context)",
    group: "memory",
    description:
      "Memory-specific upload for reading back flash contents. Used for firmware verification, backup, and reverse engineering diagnostics. Reads the complete flash memory or specified regions.",
    requestFormat: "53 [dataFormatIdentifier] [addressAndLengthFormatIdentifier] [memoryAddress] [memorySize]",
    responseFormat: "73 [lengthFormatIdentifier] [maxNumberOfBlockLength]",
    subFunctions: [
      { id: "0x01", name: "Read Flash Contents", description: "Read raw flash memory contents." },
      { id: "0x02", name: "Read With Checksum", description: "Read flash contents with integrity checksum." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x71", name: "Upload Not Accepted", description: "Memory upload rejected." },
      { code: "0x73", name: "General Programming Failure", description: "Memory read failure." },
    ],
    relatedServices: ["0x35 RequestUpload", "0x36 TransferData", "0x37 RequestTransferExit"],
    usageNotes:
      "Reading back the complete flash memory can be time-consuming. Use address range parameters to limit the upload to specific regions of interest. This service is commonly used for post-programming verification.",
  },
  {
    sid: "0x56",
    name: "RequestTransferExit (Memory Verification)",
    group: "memory",
    description:
      "Completes the memory transfer operation and triggers verification of the transferred data. The ECU performs checksum verification, CRC checks, and signature validation to ensure data integrity.",
    requestFormat: "56 [transferRequestParameterRecord]",
    responseFormat: "76 [verificationResult]",
    subFunctions: [
      { id: "0x01", name: "CRC Verification", description: "Verify data using CRC checksum." },
      { id: "0x02", name: "Signature Verification", description: "Verify digital signature of transferred data." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x73", name: "General Programming Failure", description: "Verification failed - data corruption detected." },
    ],
    relatedServices: ["0x34 RequestDownload", "0x36 TransferData", "0x37 RequestTransferExit"],
    usageNotes:
      "After this service completes successfully, the ECU has verified the integrity of the received data. If verification fails, the data transfer must be repeated. Some ECUs support multiple verification methods for enhanced reliability.",
  },
  {
    sid: "0x57",
    name: "RequestFileTransfer",
    group: "memory",
    description:
      "Transfers complete files between the tester and ECU. Supports file operations including upload, download, delete, and rename. Used for transferring calibration files, firmware images, and configuration data as complete files.",
    requestFormat: "57 [modeOfOperation] [filePathAndName] [dataFormatIdentifier]",
    responseFormat: "77 [modeOfOperation] [filePathAndName] [lengthFormatIdentifier] [maxNumberOfBlockLength]",
    subFunctions: [
      { id: "0x01", name: "Add File", description: "Upload a new file to the ECU." },
      { id: "0x02", name: "Delete File", description: "Delete a file from the ECU's file system." },
      { id: "0x03", name: "Replace File", description: "Replace an existing file with new data." },
      { id: "0x04", name: "Read File", description: "Download a file from the ECU to the tester." },
      { id: "0x05", name: "Resume File", description: "Resume a previously interrupted file transfer." },
      { id: "0x06", name: "Abort File", description: "Abort an ongoing file transfer." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x70", name: "Download Not Accepted", description: "File transfer rejected." },
      { id: "0x71", name: "Upload Not Accepted", description: "File upload not accepted." },
      { code: "0x72", name: "Transfer Data Suspended", description: "File transfer suspended." },
      { code: "0x73", name: "General Programming Failure", description: "File operation failed." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "File transfer not available." },
    ],
    relatedServices: ["0x34 RequestDownload", "0x35 RequestUpload", "0x36 TransferData"],
    usageNotes:
      "This service operates on the ECU's virtual file system. The file path format is ECU-specific but typically uses a Unix-like path structure. File transfers use TransferData (0x36) for the actual data payload. This is particularly useful for ECUs with large storage capabilities.",
  },
  {
    sid: "0x73",
    name: "WriteDataByIdentifier (Programming Context)",
    group: "memory",
    description:
      "Programming-specific data write operations. Used during the programming workflow to write configuration data, end-of-line data, calibration identifiers, and programming metadata to the ECU.",
    requestFormat: "73 [DID] [dataRecord]",
    responseFormat: "F3 [DID]",
    subFunctions: [
      { id: "0xF1A0", name: "Write End-of-Line Data", description: "Programming completion data and verification markers." },
      { id: "0xF1A1", name: "Write Programming Date", description: "Store the date of the last programming operation." },
      { id: "0xF1A2", name: "Write Programming Station ID", description: "Identify the programming station/equipment used." },
      { id: "0xF1A3", name: "Write Programmer Identification", description: "Identify the person or system that performed programming." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x2E WriteDataByIdentifier", "0x34 RequestDownload", "0x37 RequestTransferExit"],
    usageNotes:
      "These DIDs are typically only writable during or immediately after the programming session. The data is permanently stored and used for traceability and warranty purposes.",
  },
  {
    sid: "0x74",
    name: "ReadDTCInformation (Extended Memory Context)",
    group: "memory",
    description:
      "Extended DTC reading with memory context. Provides detailed DTC information including freeze frame data, extended data records, and environment data captured at the moment of fault detection. Critical for in-depth fault analysis.",
    requestFormat: "74 [reportType] [DTCStatusMask] [DTC] [recordNumber]",
    responseFormat: "F4 [reportType] [DTCAndStatusRecord] [extendedDataRecord]",
    subFunctions: [
      { id: "0x01", name: "Report Freeze Frame Data", description: "Full freeze frame with all captured sensor values at DTC occurrence." },
      { id: "0x02", name: "Report Extended Data", description: "Extended diagnostic data including ambient conditions." },
      { id: "0x03", name: "Report Environment Data", description: "Environmental conditions (temperature, voltage, speed) at DTC time." },
      { id: "0x04", name: "Report Aging Information", description: "DTC aging counters and occurrence statistics." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x18 ReadDTCInformation", "0x19 ReadDTCInformation", "0x14 ClearDiagnosticInformation"],
    usageNotes:
      "Extended DTC information provides much more detailed fault context than standard DTC reading. Freeze frame data typically includes 10-20 parameter values captured at the exact moment the fault was detected. This information is invaluable for diagnosing intermittent faults.",
  },
  {
    sid: "0x75",
    name: "ControlDTCSetting (Programming Context)",
    group: "memory",
    description:
      "Programming-context DTC control. Automatically manages DTC recording during flash programming to prevent false DTCs from being stored when the ECU is in an unstable state during firmware updates.",
    requestFormat: "75 [DTCSettingType] [DTCSettingControlOptionRecord]",
    responseFormat: "F5 [DTCSettingType]",
    subFunctions: [
      { id: "0x01", name: "DTC Recording On After Programming", description: "Re-enable DTC recording after successful programming completion." },
      { id: "0x02", name: "DTC Recording Off During Programming", description: "Disable DTC recording during programming operations." },
      { id: "0x03", name: "DTC Recording Automatic Mode", description: "Let ECU automatically manage DTC recording during programming." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x84 ControlDTCSetting", "0x14 ClearDiagnosticInformation", "0x34 RequestDownload"],
    usageNotes:
      "This is typically called automatically by the programming sequence. The ECU should disable DTC recording before programming begins and re-enable it after successful completion. If programming fails, DTCs should remain disabled to prevent false fault storage.",
  },
  {
    sid: "0x76",
    name: "ResponseOnEvent (Programming Context)",
    group: "memory",
    description:
      "Programming-context event response monitoring. Configures the ECU to report specific events during the programming process, such as memory verification completion, checksum results, or programming progress.",
    requestFormat: "76 [eventWindowTime] [eventTypeRecord]",
    responseFormat: "F6 [eventTypeRecord]",
    subFunctions: [
      { id: "0x01", name: "Programming Progress Event", description: "Report periodic programming progress updates." },
      { id: "0x02", name: "Memory Verify Event", description: "Report when memory verification completes." },
      { id: "0x03", name: "Programming Complete Event", description: "Report when programming operation finishes." },
      { id: "0x04", name: "Programming Error Event", description: "Report when a programming error occurs." },
    ],
    negativeResponses: commonNegativeResponses,
    relatedServices: ["0x85 ResponseOnEvent", "0x34 RequestDownload", "0x37 RequestTransferExit"],
    usageNotes:
      "Event monitoring during programming provides real-time feedback about the programming progress and any errors that occur. This is particularly useful for long programming operations that take several minutes.",
  },
  {
    sid: "0x77",
    name: "ReadMemoryByAddress (Extended Context)",
    group: "memory",
    description:
      "Extended memory read with support for reading protected memory regions, calibration data, and debug information. Provides enhanced addressing modes for reading from different memory spaces (flash, RAM, EEPROM).",
    requestFormat: "77 [memoryAddress] [memorySize]",
    responseFormat: "F7 [memoryAddress] [dataRecord]",
    subFunctions: [
      { id: "0x01", name: "Read Flash Memory", description: "Read from flash program memory space." },
      { id: "0x02", name: "Read EEPROM Data", description: "Read from EEPROM calibration memory." },
      { id: "0x03", name: "Read RAM Data", description: "Read from volatile RAM memory space." },
      { id: "0x04", name: "Read Configuration Memory", description: "Read from configuration registers." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x33", name: "Security Access Denied", description: "Memory region requires security access." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Memory access not available." },
    ],
    relatedServices: ["0x23 ReadMemoryByAddress", "0x55 WriteMemoryByAddress", "0x27 SecurityAccess"],
    usageNotes:
      "Different memory spaces have different access restrictions. Flash memory is typically readable without security, while EEPROM and configuration registers may require security access. The memory address must be properly aligned to the memory type's access width.",
  },
];

// GROUP 5: Security
const securityCommands: UdsCommand[] = [
  {
    sid: "0x23",
    name: "ReadMemoryByAddress (Security Context)",
    group: "security",
    description:
      "Security-restricted memory read operations. Reading certain memory regions (security keys, authentication data, cryptographic parameters) requires elevated security access and may be permanently blocked on production ECUs.",
    requestFormat: "23 [memoryAddress] [memorySize]",
    responseFormat: "63 [memoryAddress] [securityDataRecord]",
    subFunctions: [
      { id: "0x01", name: "Read Security Configuration", description: "Read security-related configuration parameters." },
      { id: "0x02", name: "Read Key Storage", description: "Read cryptographic key storage (if accessible)." },
      { id: "0x03", name: "Read Authentication Data", description: "Read authentication certificates or tokens." },
      { id: "0x04", name: "Read Access Control List", description: "Read the list of protected services and required access levels." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x33", name: "Security Access Denied", description: "Insufficient security clearance for this memory region." },
      { code: "0x35", name: "Invalid Key", description: "Security key has expired or is invalid." },
      { code: "0x36", name: "Exceeds Number Of Attempts", description: "Too many failed access attempts." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Memory access not available in current session." },
    ],
    relatedServices: ["0x27 SecurityAccess", "0x29 Authentication", "0x23 ReadMemoryByAddress"],
    usageNotes:
      "Security-sensitive memory regions are protected by multiple layers of access control. Even with the correct security level, some regions may be permanently locked (read-protected) on production ECUs. These protections are designed to prevent unauthorized access to cryptographic keys and security parameters.",
  },
  {
    sid: "0x27",
    name: "SecurityAccess (Full Specification)",
    group: "security",
    description:
      "Complete security access service with all levels, algorithms, and authentication methods. This is the primary security mechanism in UDS. Implements seed-key exchange, CAN checksum validation, and challenge-response protocols to protect critical operations.",
    requestFormat: "27 [securityLevel] [securityData]",
    responseFormat: "67 [securityLevel] [securityData]",
    subFunctions: [
      { id: "0x01", name: "Request Seed Level 1 (ISO 1)", description: "Standard seed for basic operations like reading protected DIDs. Often uses linear congruential generator." },
      { id: "0x02", name: "Send Key Level 1 (ISO 2)", description: "Computed key based on seed from level 1 request." },
      { id: "0x03", name: "Request Seed Level 2 (ISO 3)", description: "Enhanced security seed for write operations. May use AES or proprietary algorithms." },
      { id: "0x04", name: "Send Key Level 2 (ISO 4)", description: "Computed key based on seed from level 2 request." },
      { id: "0x05", name: "Request Seed Level 3 (ISO 5)", description: "Highest security level for programming. Uses strong cryptographic functions." },
      { id: "0x06", name: "Send Key Level 3 (ISO 6)", description: "Computed key based on seed from level 3 request." },
      { id: "0x07", name: "Request Seed Level 4 (ISO 7)", description: "Additional security level for specific OEM operations." },
      { id: "0x08", name: "Send Key Level 4 (ISO 8)", description: "Computed key based on seed from level 4 request." },
      { id: "0x11", name: "Request Seed (OEM-Specific)", description: "OEM-specific security seed request." },
      { id: "0x12", name: "Send Key (OEM-Specific)", description: "OEM-specific security key response." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x22", name: "Conditions Not Correct", description: "Security preconditions not met." },
      { code: "0x35", name: "Invalid Key", description: "The provided key does not match the expected value for the seed." },
      { code: "0x36", name: "Exceeds Number Of Attempts", description: "Too many failed attempts. Access is temporarily or permanently locked." },
      { code: "0x37", name: "Required Time Delay Not Expired", description: "Must wait before the next attempt (anti-brute-force)." },
      { code: "0x40", name: "Verification Without Accessing Security Level", description: "Special case for certain verification operations." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Security service not available in current session." },
    ],
    relatedServices: ["0x29 Authentication", "0x10 DiagnosticSessionControl", "0x2E WriteDataByIdentifier", "0x34 RequestDownload"],
    usageNotes:
      "The security access mechanism works as follows: (1) Tester sends requestSeed, (2) ECU responds with a random seed value, (3) Tester computes key from seed using the known algorithm, (4) Tester sends sendKey with the computed key, (5) ECU verifies the key and grants access if correct. Common algorithms include: XOR-based, linear congruential, AES-based, and custom OEM algorithms. After successful unlock, the security state persists until the S3 timer expires or the ECU is reset.",
  },
  {
    sid: "0x69",
    name: "ReadDataByPeriodicIdentifier (Security Context)",
    group: "security",
    description:
      "Security-monitored periodic data reading. When security-related data is being monitored periodically, this service ensures that the data transmission is authenticated and integrity-protected to prevent tampering or spoofing.",
    requestFormat: "69 [transmissionMode] [periodicIdentifier]",
    responseFormat: "E9 [periodicIdentifier] [securedDataRecord]",
    subFunctions: [
      { id: "0x01", name: "Start Secured Periodic Transmission", description: "Begin authenticated periodic data reporting." },
      { id: "0x02", name: "Stop Secured Periodic Transmission", description: "Stop authenticated periodic data reporting." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x33", name: "Security Access Denied", description: "Insufficient security level for this data." },
    ],
    relatedServices: ["0x1A ReadDataByPeriodicIdentifier", "0x22 ReadDataByIdentifier", "0x27 SecurityAccess"],
    usageNotes:
      "This service provides an additional security layer for periodic data transmission. The data records may include message authentication codes (MAC) to ensure data integrity. Used in safety-critical applications where data tampering could have serious consequences.",
  },
  {
    sid: "0x71",
    name: "WriteDataByIdentifier (Security Context)",
    group: "security",
    description:
      "Security-protected data write operations. Writing to security-critical DIDs (security keys, access control configurations, authentication parameters) requires specific security levels and may involve additional verification steps.",
    requestFormat: "71 [DID] [securedDataRecord]",
    responseFormat: "F1 [DID]",
    subFunctions: [
      { id: "0xF200", name: "Write Security Configuration", description: "Update security configuration parameters." },
      { id: "0xF201", name: "Update Access Control List", description: "Modify which services require security access." },
      { id: "0xF202", name: "Write Security Key", description: "Update security key used for seed-key authentication." },
      { id: "0xF203", name: "Update Authentication Parameters", description: "Modify authentication timeout and retry parameters." },
      { id: "0xF204", name: "Write Communication Protection Config", description: "Configure secure communication parameters." },
    ],
    negativeResponses: [
      ...commonNegativeResponses,
      { code: "0x33", name: "Security Access Denied", description: "Highest security level required." },
      { code: "0x35", name: "Invalid Key", description: "Security key is invalid or expired." },
      { code: "0x36", name: "Exceeds Number Of Attempts", description: "Too many failed write attempts." },
      { code: "0x7F", name: "Service Not Supported In Active Session", description: "Security write not available." },
    ],
    relatedServices: ["0x2E WriteDataByIdentifier", "0x27 SecurityAccess", "0x29 Authentication", "0x22 ReadDataByIdentifier"],
    usageNotes:
      "Writing to security DIDs is a critical operation that typically requires the highest security level and may be irreversible. Changes to security configuration can permanently lock the ECU if done incorrectly. Always have a backup of the current configuration before making changes. Some security parameters can only be written once (write-once).",
  },
];

// Complete UDS Groups
export const udsGroups: UdsGroup[] = [
  {
    id: "session",
    name: "Session & Communication",
    description: "Diagnostic session management, ECU communication control, and security authentication services. These services manage how the tester interacts with the ECU.",
    color: "emerald",
    icon: "Wifi",
    commands: sessionCommands,
  },
  {
    id: "data",
    name: "Data Access",
    description: "Services for reading and writing diagnostic data, including DTCs, live data, identification data, and memory access. The most frequently used UDS service group.",
    color: "amber",
    icon: "Database",
    commands: dataAccessCommands,
  },
  {
    id: "io",
    name: "Input/Output Control",
    description: "Control of ECU input/output signals, actuator testing, routine execution, and data transfer services. Essential for active diagnostics and programming.",
    color: "violet",
    icon: "Settings2",
    commands: ioControlCommands,
  },
  {
    id: "memory",
    name: "Memory & Programming",
    description: "Flash memory programming, firmware updates, file transfers, and memory management services. Used during ECU programming and re-flashing operations.",
    color: "rose",
    icon: "HardDrive",
    commands: memoryCommands,
  },
  {
    id: "security",
    name: "Security",
    description: "Security access, authentication, key management, and protected data operations. Prevents unauthorized diagnostic and programming operations.",
    color: "slate",
    icon: "Shield",
    commands: securityCommands,
  },
];

// Helper: Get all commands as a flat array
export function getAllCommands(): UdsCommand[] {
  return udsGroups.flatMap((g) => g.commands);
}

// Helper: Find a command by SID
export function findCommandBySid(sid: string): UdsCommand | undefined {
  return getAllCommands().find((c) => c.sid === sid);
}

// Helper: Find a group by ID
export function findGroupById(groupId: string): UdsGroup | undefined {
  return udsGroups.find((g) => g.id === groupId);
}

// Helper: Get all unique negative response codes
export function getAllNegativeResponseCodes(): UdsNegativeResponse[] {
  const seen = new Set<string>();
  return getAllCommands().flatMap((c) =>
    c.negativeResponses.filter((n) => {
      if (seen.has(n.code)) return false;
      seen.add(n.code);
      return true;
    })
  );
}

// For AI search: Generate a compact text representation of the entire database
export function generateDatabaseContext(): string {
  let context = "UDS (ISO 14229) Command Reference Database:\n\n";

  for (const group of udsGroups) {
    context += `## ${group.name}\n`;
    context += `${group.description}\n\n`;

    for (const cmd of group.commands) {
      context += `### ${cmd.sid} ${cmd.name}\n`;
      context += `${cmd.description}\n`;
      context += `Request: ${cmd.requestFormat}\n`;
      context += `Response: ${cmd.responseFormat}\n`;

      if (cmd.subFunctions.length > 0) {
        context += "Sub-functions:\n";
        for (const sf of cmd.subFunctions) {
          context += `  - ${sf.id} ${sf.name}: ${sf.description}\n`;
        }
      }

      if (cmd.negativeResponses.length > 0) {
        context += "Negative responses:\n";
        for (const nr of cmd.negativeResponses) {
          context += `  - ${nr.code} ${nr.name}: ${nr.description}\n`;
        }
      }

      if (cmd.relatedServices.length > 0) {
        context += `Related: ${cmd.relatedServices.join(", ")}\n`;
      }

      if (cmd.usageNotes) {
        context += `Notes: ${cmd.usageNotes}\n`;
      }

      context += "\n";
    }
  }

  return context;
}
