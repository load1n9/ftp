export enum StatusCode {
	StatusInitiating    = 100,
	StatusRestartMarker = 110,
	StatusReadyMinute   = 120,
	StatusAlreadyOpen   = 125,
	StatusAboutToSend   = 150,
 
 	StatusCommandOK             = 200,
 	StatusCommandNotImplemented = 202,
 	StatusSystem                = 211,
 	StatusDirectory             = 212,
 	StatusFile                  = 213,
 	StatusHelp                  = 214,
 	StatusName                  = 215,
 	StatusReady                 = 220,
 	StatusClosing               = 221,
 	StatusDataConnectionOpen    = 225,
 	StatusClosingDataConnection = 226,
 	StatusPassiveMode           = 227, 
 	StatusLongPassiveMode       = 228,
 	StatusExtendedPassiveMode   = 229,
 	StatusLoggedIn              = 230,
 	StatusLoggedOut             = 231,
 	StatusLogoutAck             = 232,
 	StatusAuthOK                = 234,
 	StatusRequestedFileActionOK = 250,
 	StatusPathCreated           = 257,
 
 	StatusUserOK             = 331,
 	StatusLoginNeedAccount   = 332,
 	StatusRequestFilePending = 350,
 
	StatusNotAvailable             = 421,
	StatusCanNotOpenDataConnection = 425,
	StatusTransfertAborted         = 426,
	StatusInvalidCredentials       = 430,
	StatusHostUnavailable          = 434,
	StatusFileActionIgnored        = 450,
	StatusActionAborted            = 451,
	Status452                      = 452,

	StatusBadCommand              = 500,
	StatusBadArguments            = 501,
	StatusNotImplemented          = 502,
	StatusBadSequence             = 503,
	StatusNotImplementedParameter = 504,
	StatusNotLoggedIn             = 530,
	StatusStorNeedAccount         = 532,
	StatusFileUnavailable         = 550,
	StatusPageTypeUnknown         = 551,
	StatusExceededStorage         = 552,
	StatusBadFileName             = 553,
}

const StatusText: { [code: number]: string } = {
	// 200
	[StatusCode.StatusInitiating]:             "Command okay.",
	[StatusCode.StatusCommandNotImplemented]: "Command not implemented, superfluous at this site.",
	[StatusCode.StatusSystem]:                "System status, or system help reply.",
	[StatusCode.StatusDirectory]:             "Directory status.",
	[StatusCode.StatusFile]:                  "File status.",
	[StatusCode.StatusHelp]:                  "Help message.",
	[StatusCode.StatusName]:                  "",
	[StatusCode.StatusReady]:                 "Service ready for new user.",
	[StatusCode.StatusClosing]:               "Service closing control connection.",
	[StatusCode.StatusDataConnectionOpen]:    "Data connection open; no transfer in progress.",
	[StatusCode.StatusClosingDataConnection]: "Closing data connection. Requested file action successful.",
	[StatusCode.StatusPassiveMode]:           "Entering Passive Mode.",
	[StatusCode.StatusLongPassiveMode]:       "Entering Long Passive Mode.",
	[StatusCode.StatusExtendedPassiveMode]:   "Entering Extended Passive Mode.",
	[StatusCode.StatusLoggedIn]:              "User logged in, proceed.",
	[StatusCode.StatusLoggedOut]:             "User logged out; service terminated.",
	[StatusCode.StatusLogoutAck]:             "Logout command noted, will complete when transfer done.",
	[StatusCode.StatusAuthOK]:                "AUTH command OK",
	[StatusCode.StatusRequestedFileActionOK]: "Requested file action okay, completed.",
	[StatusCode.StatusPathCreated]:           "Path created.",

	// // 300
	[StatusCode.StatusUserOK]:             "User name okay, need password.",
	[StatusCode.StatusLoginNeedAccount]:   "Need account for login.",
	[StatusCode.StatusRequestFilePending]: "Requested file action pending further information.",

	// // 400
	[StatusCode.StatusNotAvailable]:             "Service not available, closing control connection.",
	[StatusCode.StatusCanNotOpenDataConnection]: "Can't open data connection.",
	[StatusCode.StatusTransfertAborted]:         "Connection closed; transfer aborted.",
	[StatusCode.StatusInvalidCredentials]:       "Invalid username or password.",
	[StatusCode.StatusHostUnavailable]:          "Requested host unavailable.",
	[StatusCode.StatusFileActionIgnored]:        "Requested file action not taken.",
	[StatusCode.StatusActionAborted]:            "Requested action aborted. Local error in processing.",
	[StatusCode.Status452]:                      "Insufficient storage space in system.",

	// // 500
	[StatusCode.StatusBadCommand]:              "Command unrecognized.",
	[StatusCode.StatusBadArguments]:            "Syntax error in parameters or arguments.",
	[StatusCode.StatusNotImplemented]:          "Command not implemented.",
	[StatusCode.StatusBadSequence]:             "Bad sequence of commands.",
	[StatusCode.StatusNotImplementedParameter]: "Command not implemented for that parameter.",
	[StatusCode.StatusNotLoggedIn]:             "Not logged in.",
	[StatusCode.StatusStorNeedAccount]:         "Need account for storing files.",
	[StatusCode.StatusFileUnavailable]:         "File unavailable.",
	[StatusCode.StatusPageTypeUnknown]:         "Page type unknown.",
	[StatusCode.StatusExceededStorage]:         "Exceeded storage allocation.",
	[StatusCode.StatusBadFileName]:             "File name not allowed.",
}

export function statusText(code: number) {
	const str = StatusText[code]
	if (!str) {
		console.log("Unknown status code: ", code)
	}
	return str
}