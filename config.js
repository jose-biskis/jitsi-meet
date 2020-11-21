/* eslint-disable no-unused-vars, no-var */

var config = {
    // Connection
    //

    hosts: {
        // XMPP domain.
        domain: 'meet.ozjitsi.xyz',

        // When using authentication, domain for guest users.
        // anonymousdomain: 'guest.example.com',

        // Domain for authenticated users. Defaults to <domain>.
        // authdomain: 'meet.ozjitsi.xyz',

        // Call control component (Jigasi).
        // call_control: 'callcontrol.meet.ozjitsi.xyz',

        // Focus component domain. Defaults to focus.<domain>.
        // focus: 'focus.meet.ozjitsi.xyz',

        // XMPP MUC domain. FIXME: use XEP-0030 to discover it.
        muc: 'conference.<!--# echo var="subdomain" default="" -->meet.ozjitsi.xyz'
    },

    disableSimulcast: false,
    enableRemb: false,
    enableTcc: true,
    resolution: 360,
    constraints: {
        video: {
            aspectRatio: 16 / 9,
            height: {
                ideal: 360,
                max: 360,
                min: 180
            },
            width: {
                ideal: 640,
                max: 640,
                min: 320
            }
        }
    },
    externalConnectUrl: '//meet.ozjitsi.xyz/http-pre-bind',
    analytics: {
	amplitudeAPPKey: "2719ff8976e947a6cc804bd1bb9c9cc6",
        whiteListedEvents: ['rtcstats.trace.onclose', 'conference.joined', 'page.reload.scheduled', 'rejoined', 'transport.stats', 'rtcstats.trace.onclose'],
	rtcstatsEnabled: true,    
        rtcstatsEndpoint: "wss://rtcstats-server-pilot.jitsi.net/",
        rtcstatsPolIInterval: 1000
    },
    p2pStunServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ],
    //enableP2P: false, // flag to control P2P connections
    // New P2P options
    p2p: {
        enabled: false,
        preferH264: true,
        disableH264: true,
        useStunTurn: true, // use XEP-0215 to fetch STUN and TURN server for the P2P connection
        stunServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" }
        ]
    },
    useStunTurn: true, // use XEP-0215 to fetch STUN and TURN server for the JVB connection
    useIPv6: false, // ipv6 support. use at your own risk
    useNicks: false,
    bosh: '//meet.ozjitsi.xyz/http-bind', // FIXME: use xep-0156 for that

    //etherpad_base: 'https://meet.ozjitsi.xyz/etherpad/p/',
    clientNode: 'http://jitsi.org/jitsimeet', // The name of client node advertised in XEP-0115 'c' stanza
    //deprecated desktop sharing settings, included only because older version of jitsi-meet require them
    desktopSharing: 'ext', // Desktop sharing method. Can be set to 'ext', 'webrtc' or false to disable.
    chromeExtensionId: 'pgplkhlodppdcflanmijbnpgpjkegfgc', // Id of desktop streamer Chrome extension
    desktopSharingSources: ['screen', 'window'],
    //new desktop sharing settings
    desktopSharingChromeExtId: 'pgplkhlodppdcflanmijbnpgpjkegfgc', // Id of desktop streamer Chrome extension
    desktopSharingChromeDisabled: false,
    desktopSharingChromeSources: ['screen', 'window', 'tab'],
    desktopSharingChromeMinExtVersion: '0.1.3', // Required version of Chrome extension
    desktopSharingFirefoxExtId: "jidesha@meet.ozjitsi.xyz",
    desktopSharingFirefoxDisabled: true,
    desktopSharingFirefoxMaxVersionExtRequired: '0',
    desktopSharingFirefoxExtensionURL: "",
    useRoomAsSharedDocumentName: false,
    enableLipSync: false, // Disables lip-sync everywhere.
    disableRtx: false, // Enables RTX everywhere
    enableRtpStats: false, // Enables RTP stats processing
    enableStatsID: true,
    openBridgeChannel: 'websocket', // One of true, 'datachannel', or 'websocket'
    //openBridgeChannel: 'datachannel', // One of true, 'datachannel', or 'websocket'
    channelLastN: -1, // The default value of the channel attribute last-n.
    minHDHeight: 540,
    startBitrate: "800",
    disableAudioLevels: false,
    useRtcpMux: true,
    useBundle: true,
    disableSuspendVideo: true,
    stereo: true,
    forceJVB121Ratio:  -1,
    enableTalkWhileMuted: true,

    hiddenDomain: 'recorder.meet.ozjitsi.xyz',
    transcribingEnabled: false,
    enableRecording: true,
    liveStreamingEnabled: true,
    fileRecordingsEnabled: false,
    fileRecordingsServiceEnabled: false,
    fileRecordingsServiceSharingEnabled: false,
    requireDisplayName: false,
    recordingType: 'jibri',
    enableWelcomePage: true,
    isBrand: false,
    logStats: false,
// To enable sending statistics to callstats.io you should provide Applicaiton ID and Secret.
    callStatsID: "294674397",//Application ID for callstats.io API
    callStatsSecret: "9IJJTtOdheZs:MHov7tz0Gc3h/6NYXiNVCqA1tpTmKPH0AdXTYtAKVRY=",//Secret for callstats.io API
    dialInNumbersUrl: 'https://api.jitsi.net/phoneNumberList',
    dialInConfCodeUrl:  'https://api.jitsi.net/conferenceMapper',

    dialOutCodesUrl:  'https://api.jitsi.net/countrycodes',
    dialOutAuthUrl: 'https://api.jitsi.net/authorizephone',
    peopleSearchUrl: 'https://api.jitsi.net/directorySearch',
    inviteServiceUrl: 'https://api.jitsi.net/conferenceInvite',
    inviteServiceCallFlowsUrl: 'https://api.jitsi.net/conferenceinvitecallflows',
    peopleSearchQueryTypes: ['user','conferenceRooms'],
    startAudioMuted: 9,
    startVideoMuted: 9,
    prejoinPageEnabled: true,
    enableUserRolesBasedOnToken: false,
    hepopAnalyticsUrl: "",
    hepopAnalyticsEvent: {
        product: "lib-jitsi-meet",
        subproduct: "alpha",
        name: "jitsi.page.load.failed",
        action: "page.load.failed",
        actionSubject: "page.load",
        type: "page.load.failed",
        source: "page.load",
        attributes: {
            type: "operational",
            source: 'page.load'
        },
        server: "meet.ozjitsi.xyz"
    },
    deploymentInfo: {
        environment: 'alpha',
        envType: 'dev',
        releaseNumber: '',
        shard: 'all',
        region: 'us-west-2',
        userRegion: '',
        crossRegion: (!'' || 'us-west-2' === 'default_region') ? 0 : 1
    },
    rttMonitor: {
        enabled: false,
        initialDelay: 30000,
        getStatsInterval: 10000,
        analyticsInterval: 60000,
        stunServers: {"ap-se-1": "all-ap-se-1-turn.jitsi.net:443", "ap-se-2": "all-ap-se-2-turn.jitsi.net:443", "eu-central-1": "all-eu-central-1-turn.jitsi.net:443", "eu-west-1": "all-eu-west-1-turn.jitsi.net:443", "us-east-1": "all-us-east-1-turn.jitsi.net:443", "us-west-2": "all-us-west-2-turn.jitsi.net:443"}
    },
    abTesting: {
    },
    testing: {
        octo: {
            probability: 0
        }
    }
};

/* eslint-enable no-unused-vars, no-var */

