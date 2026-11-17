// Temporal's time zones: IANA ids resolved case-insensitively through
// time.LoadLocation (time/tzdata is embedded, so named zones work everywhere),
// fixed offsets (±HH:MM), the local zone id (the TZ env var, /etc/localtime on
// Unix, the Windows registry's TimeZoneKeyName mapped through CLDR's
// windowsZones table), the offset at an instant, the possible instants of a
// local time (the DST gap and overlap) with each disambiguation mode, and the
// transition instants from time.Time.ZoneBounds.
import { defineHelper } from './registry.js';
// CLDR windowsZones.xml: each Windows time zone name's default (territory
// 001) IANA zone
const WINDOWS_ZONES = [
    ["Dateline Standard Time", "Etc/GMT+12"],
    ["UTC-11", "Etc/GMT+11"],
    ["Aleutian Standard Time", "America/Adak"],
    ["Hawaiian Standard Time", "Pacific/Honolulu"],
    ["Marquesas Standard Time", "Pacific/Marquesas"],
    ["Alaskan Standard Time", "America/Anchorage"],
    ["UTC-09", "Etc/GMT+9"],
    ["Pacific Standard Time (Mexico)", "America/Tijuana"],
    ["UTC-08", "Etc/GMT+8"],
    ["Pacific Standard Time", "America/Los_Angeles"],
    ["US Mountain Standard Time", "America/Phoenix"],
    ["Mountain Standard Time (Mexico)", "America/Mazatlan"],
    ["Mountain Standard Time", "America/Denver"],
    ["British Columbia Standard Time", "America/Vancouver"],
    ["Yukon Standard Time", "America/Whitehorse"],
    ["Alberta Standard Time", "America/Edmonton"],
    ["Central America Standard Time", "America/Guatemala"],
    ["Central Standard Time", "America/Chicago"],
    ["Easter Island Standard Time", "Pacific/Easter"],
    ["Central Standard Time (Mexico)", "America/Mexico_City"],
    ["Canada Central Standard Time", "America/Regina"],
    ["Manitoba Standard Time", "America/Winnipeg"],
    ["SA Pacific Standard Time", "America/Bogota"],
    ["Eastern Standard Time (Mexico)", "America/Cancun"],
    ["Eastern Standard Time", "America/New_York"],
    ["Haiti Standard Time", "America/Port-au-Prince"],
    ["Cuba Standard Time", "America/Havana"],
    ["US Eastern Standard Time", "America/Indianapolis"],
    ["Turks And Caicos Standard Time", "America/Grand_Turk"],
    ["Paraguay Standard Time", "America/Asuncion"],
    ["Atlantic Standard Time", "America/Halifax"],
    ["Venezuela Standard Time", "America/Caracas"],
    ["Central Brazilian Standard Time", "America/Cuiaba"],
    ["SA Western Standard Time", "America/La_Paz"],
    ["Pacific SA Standard Time", "America/Santiago"],
    ["Newfoundland Standard Time", "America/St_Johns"],
    ["Tocantins Standard Time", "America/Araguaina"],
    ["E. South America Standard Time", "America/Sao_Paulo"],
    ["SA Eastern Standard Time", "America/Cayenne"],
    ["Argentina Standard Time", "America/Buenos_Aires"],
    ["Greenland Standard Time", "America/Godthab"],
    ["Montevideo Standard Time", "America/Montevideo"],
    ["Magallanes Standard Time", "America/Punta_Arenas"],
    ["Saint Pierre Standard Time", "America/Miquelon"],
    ["Bahia Standard Time", "America/Bahia"],
    ["UTC-02", "Etc/GMT+2"],
    ["Azores Standard Time", "Atlantic/Azores"],
    ["Cape Verde Standard Time", "Atlantic/Cape_Verde"],
    ["UTC", "Etc/UTC"],
    ["GMT Standard Time", "Europe/London"],
    ["Greenwich Standard Time", "Atlantic/Reykjavik"],
    ["Sao Tome Standard Time", "Africa/Sao_Tome"],
    ["Morocco Standard Time", "Africa/Casablanca"],
    ["W. Europe Standard Time", "Europe/Berlin"],
    ["Central Europe Standard Time", "Europe/Budapest"],
    ["Romance Standard Time", "Europe/Paris"],
    ["Central European Standard Time", "Europe/Warsaw"],
    ["W. Central Africa Standard Time", "Africa/Lagos"],
    ["Jordan Standard Time", "Asia/Amman"],
    ["GTB Standard Time", "Europe/Bucharest"],
    ["Middle East Standard Time", "Asia/Beirut"],
    ["Egypt Standard Time", "Africa/Cairo"],
    ["E. Europe Standard Time", "Europe/Chisinau"],
    ["Syria Standard Time", "Asia/Damascus"],
    ["West Bank Standard Time", "Asia/Hebron"],
    ["South Africa Standard Time", "Africa/Johannesburg"],
    ["FLE Standard Time", "Europe/Kiev"],
    ["Israel Standard Time", "Asia/Jerusalem"],
    ["South Sudan Standard Time", "Africa/Juba"],
    ["Kaliningrad Standard Time", "Europe/Kaliningrad"],
    ["Sudan Standard Time", "Africa/Khartoum"],
    ["Libya Standard Time", "Africa/Tripoli"],
    ["Namibia Standard Time", "Africa/Windhoek"],
    ["Arabic Standard Time", "Asia/Baghdad"],
    ["Turkey Standard Time", "Europe/Istanbul"],
    ["Arab Standard Time", "Asia/Riyadh"],
    ["Belarus Standard Time", "Europe/Minsk"],
    ["Russian Standard Time", "Europe/Moscow"],
    ["E. Africa Standard Time", "Africa/Nairobi"],
    ["Iran Standard Time", "Asia/Tehran"],
    ["Arabian Standard Time", "Asia/Dubai"],
    ["Astrakhan Standard Time", "Europe/Astrakhan"],
    ["Azerbaijan Standard Time", "Asia/Baku"],
    ["Russia Time Zone 3", "Europe/Samara"],
    ["Mauritius Standard Time", "Indian/Mauritius"],
    ["Saratov Standard Time", "Europe/Saratov"],
    ["Georgian Standard Time", "Asia/Tbilisi"],
    ["Volgograd Standard Time", "Europe/Volgograd"],
    ["Caucasus Standard Time", "Asia/Yerevan"],
    ["Afghanistan Standard Time", "Asia/Kabul"],
    ["West Asia Standard Time", "Asia/Tashkent"],
    ["Ekaterinburg Standard Time", "Asia/Yekaterinburg"],
    ["Pakistan Standard Time", "Asia/Karachi"],
    ["Qyzylorda Standard Time", "Asia/Qyzylorda"],
    ["India Standard Time", "Asia/Calcutta"],
    ["Sri Lanka Standard Time", "Asia/Colombo"],
    ["Nepal Standard Time", "Asia/Katmandu"],
    ["Central Asia Standard Time", "Asia/Bishkek"],
    ["Bangladesh Standard Time", "Asia/Dhaka"],
    ["Omsk Standard Time", "Asia/Omsk"],
    ["Myanmar Standard Time", "Asia/Rangoon"],
    ["SE Asia Standard Time", "Asia/Bangkok"],
    ["Altai Standard Time", "Asia/Barnaul"],
    ["W. Mongolia Standard Time", "Asia/Hovd"],
    ["North Asia Standard Time", "Asia/Krasnoyarsk"],
    ["N. Central Asia Standard Time", "Asia/Novosibirsk"],
    ["Tomsk Standard Time", "Asia/Tomsk"],
    ["China Standard Time", "Asia/Shanghai"],
    ["North Asia East Standard Time", "Asia/Irkutsk"],
    ["Singapore Standard Time", "Asia/Singapore"],
    ["W. Australia Standard Time", "Australia/Perth"],
    ["Taipei Standard Time", "Asia/Taipei"],
    ["Ulaanbaatar Standard Time", "Asia/Ulaanbaatar"],
    ["Aus Central W. Standard Time", "Australia/Eucla"],
    ["Transbaikal Standard Time", "Asia/Chita"],
    ["Tokyo Standard Time", "Asia/Tokyo"],
    ["North Korea Standard Time", "Asia/Pyongyang"],
    ["Korea Standard Time", "Asia/Seoul"],
    ["Yakutsk Standard Time", "Asia/Yakutsk"],
    ["Cen. Australia Standard Time", "Australia/Adelaide"],
    ["AUS Central Standard Time", "Australia/Darwin"],
    ["E. Australia Standard Time", "Australia/Brisbane"],
    ["AUS Eastern Standard Time", "Australia/Sydney"],
    ["West Pacific Standard Time", "Pacific/Port_Moresby"],
    ["Tasmania Standard Time", "Australia/Hobart"],
    ["Vladivostok Standard Time", "Asia/Vladivostok"],
    ["Lord Howe Standard Time", "Australia/Lord_Howe"],
    ["Bougainville Standard Time", "Pacific/Bougainville"],
    ["Russia Time Zone 10", "Asia/Srednekolymsk"],
    ["Magadan Standard Time", "Asia/Magadan"],
    ["Norfolk Standard Time", "Pacific/Norfolk"],
    ["Sakhalin Standard Time", "Asia/Sakhalin"],
    ["Central Pacific Standard Time", "Pacific/Guadalcanal"],
    ["Russia Time Zone 11", "Asia/Kamchatka"],
    ["New Zealand Standard Time", "Pacific/Auckland"],
    ["UTC+12", "Etc/GMT-12"],
    ["Fiji Standard Time", "Pacific/Fiji"],
    ["Chatham Islands Standard Time", "Pacific/Chatham"],
    ["UTC+13", "Etc/GMT-13"],
    ["Tonga Standard Time", "Pacific/Tongatapu"],
    ["Samoa Standard Time", "Pacific/Apia"],
    ["Line Islands Standard Time", "Pacific/Kiritimati"]
];
// The IANA zone names the embedded tzdata carries, for the case-insensitive
// id matching Node does ('america/new_york' → 'America/New_York')
const IANA_ZONES = `Africa/Abidjan Africa/Accra Africa/Addis_Ababa Africa/Algiers Africa/Asmara Africa/Asmera Africa/Bamako Africa/Bangui Africa/Banjul Africa/Bissau Africa/Blantyre Africa/Brazzaville Africa/Bujumbura Africa/Cairo Africa/Casablanca Africa/Ceuta Africa/Conakry Africa/Dakar Africa/Dar_es_Salaam Africa/Djibouti Africa/Douala Africa/El_Aaiun Africa/Freetown Africa/Gaborone Africa/Harare Africa/Johannesburg Africa/Juba Africa/Kampala Africa/Khartoum Africa/Kigali Africa/Kinshasa Africa/Lagos Africa/Libreville Africa/Lome Africa/Luanda Africa/Lubumbashi Africa/Lusaka Africa/Malabo Africa/Maputo Africa/Maseru Africa/Mbabane Africa/Mogadishu Africa/Monrovia Africa/Nairobi Africa/Ndjamena Africa/Niamey Africa/Nouakchott Africa/Ouagadougou Africa/Porto-Novo Africa/Sao_Tome Africa/Timbuktu Africa/Tripoli Africa/Tunis Africa/Windhoek America/Adak America/Anchorage America/Anguilla America/Antigua America/Araguaina America/Argentina/Buenos_Aires America/Argentina/Catamarca America/Argentina/ComodRivadavia America/Argentina/Cordoba America/Argentina/Ushuaia America/Aruba America/Asuncion America/Atikokan America/Bahia America/Bahia_Banderas America/Barbados America/Belem America/Belize America/Blanc-Sablon America/Boa_Vista America/Bogota America/Boise America/Buenos_Aires America/Cambridge_Bay America/Campo_Grande America/Cancun America/Caracas America/Catamarca America/Cayenne America/Cayman America/Chicago America/Chihuahua America/Ciudad_Juarez America/Coral_Harbour America/Cordoba America/Costa_Rica America/Creston America/Cuiaba America/Curacao America/Danmarkshavn America/Dawson America/Dawson_Creek America/Denver America/Detroit America/Dominica America/Edmonton America/Eirunepe America/El_Salvador America/Ensenada America/Fort_Nelson America/Fort_Wayne America/Fortaleza America/Glace_Bay America/Godthab America/Goose_Bay America/Grand_Turk America/Grenada America/Guadeloupe America/Guatemala America/Guayaquil America/Guyana America/Halifax America/Havana America/Hermosillo America/Indiana/Indianapolis America/Indiana/Knox America/Indiana/Marengo America/Indiana/Petersburg America/Indiana/Tell_City America/Indiana/Vevay America/Indiana/Vincennes America/Indiana/Winamac America/Indianapolis America/Inuvik America/Iqaluit America/Jamaica America/Jujuy America/Juneau America/Kentucky/Louisville America/Kentucky/Monticello America/Knox_IN America/Kralendijk America/La_Paz America/Lima America/Los_Angeles America/Louisville America/Lower_Princes America/Maceio America/Managua America/Manaus America/Marigot America/Martinique America/Matamoros America/Mazatlan America/Mendoza America/Menominee America/Merida America/Metlakatla America/Mexico_City America/Miquelon America/Moncton America/Monterrey America/Montevideo America/Montreal America/Montserrat America/Nassau America/New_York America/Nipigon America/Nome America/Noronha America/North_Dakota/Beulah America/North_Dakota/Center America/North_Dakota/New_Salem America/Nuuk America/Ojinaga America/Panama America/Pangnirtung America/Paramaribo America/Phoenix America/Port-au-Prince America/Port_of_Spain America/Porto_Acre America/Puerto_Rico America/Punta_Arenas America/Rainy_River America/Rankin_Inlet America/Recife America/Regina America/Resolute America/Rio_Branco America/Rosario America/Santa_Isabel America/Santarem America/Santiago America/Santo_Domingo America/Sao_Paulo America/Scoresbysund America/Shiprock America/Sitka America/St_Barthelemy America/St_Johns America/St_Kitts America/St_Lucia America/St_Thomas America/St_Vincent America/Swift_Current America/Tegucigalpa America/Thule America/Thunder_Bay America/Tijuana America/Toronto America/Tortola America/Vancouver America/Virgin America/Whitehorse America/Winnipeg America/Yakutat America/Yellowknife Antarctica/Casey Antarctica/Davis Antarctica/DumontDUrville Antarctica/Macquarie Antarctica/Mawson Antarctica/McMurdo Antarctica/Palmer Antarctica/Rothera Antarctica/South_Pole Antarctica/Syowa Antarctica/Troll Antarctica/Vostok Arctic/Longyearbyen Asia/Aden Asia/Almaty Asia/Amman Asia/Anadyr Asia/Aqtau Asia/Aqtobe Asia/Ashgabat Asia/Ashkhabad Asia/Atyrau Asia/Baghdad Asia/Bahrain Asia/Baku Asia/Bangkok Asia/Barnaul Asia/Beirut Asia/Bishkek Asia/Brunei Asia/Calcutta Asia/Chita Asia/Choibalsan Asia/Chongqing Asia/Chungking Asia/Colombo Asia/Dacca Asia/Damascus Asia/Dhaka Asia/Dili Asia/Dubai Asia/Dushanbe Asia/Famagusta Asia/Gaza Asia/Harbin Asia/Hebron Asia/Ho_Chi_Minh Asia/Hong_Kong Asia/Hovd Asia/Irkutsk Asia/Istanbul Asia/Jakarta Asia/Jayapura Asia/Jerusalem Asia/Kabul Asia/Kamchatka Asia/Karachi Asia/Katmandu Asia/Khandyga Asia/Kolkata Asia/Krasnoyarsk Asia/Kuala_Lumpur Asia/Kuching Asia/Kuwait Asia/Macao Asia/Macau Asia/Magadan Asia/Makassar Asia/Manila Asia/Muscat Asia/Nicosia Asia/Novokuznetsk Asia/Novosibirsk Asia/Omsk Asia/Oral Asia/Phnom_Penh Asia/Pontianak Asia/Pyongyang Asia/Qatar Asia/Qostanay Asia/Qyzylorda Asia/Rangoon Asia/Riyadh Asia/Saigon Asia/Sakhalin Asia/Samarkand Asia/Seoul Asia/Shanghai Asia/Singapore Asia/Srednekolymsk Asia/Taipei Asia/Tashkent Asia/Tbilisi Asia/Tehran Asia/Tel_Aviv Asia/Thimbu Asia/Thimphu Asia/Tokyo Asia/Tomsk Asia/Ujung_Pandang Asia/Ulaanbaatar Asia/Ulan_Bator Asia/Urumqi Asia/Ust-Nera Asia/Vientiane Asia/Vladivostok Asia/Yakutsk Asia/Yangon Asia/Yekaterinburg Asia/Yerevan Atlantic/Azores Atlantic/Bermuda Atlantic/Canary Atlantic/Cape_Verde Atlantic/Faeroe Atlantic/Faroe Atlantic/Jan_Mayen Atlantic/Madeira Atlantic/Reykjavik Atlantic/South_Georgia Atlantic/St_Helena Atlantic/Stanley Australia/ACT Australia/Adelaide Australia/Brisbane Australia/Broken_Hill Australia/Canberra Australia/Currie Australia/Darwin Australia/Eucla Australia/Hobart Australia/LHI Australia/Lindeman Australia/Lord_Howe Australia/Melbourne Australia/NSW Australia/North Australia/Perth Australia/Queensland Australia/South Australia/Sydney Australia/Tasmania Australia/Victoria Australia/West Australia/Yancowinna Brazil/Acre Brazil/DeNoronha Brazil/East Brazil/West CET CST6CDT Canada/Atlantic Canada/Central Canada/East-Saskatchewan Canada/Eastern Canada/Mountain Canada/Newfoundland Canada/Pacific Canada/Saskatchewan Canada/Yukon Chile/Continental Chile/EasterIsland Cuba EET EST EST5EDT Egypt Eire Etc/GMT Etc/GMT+0 Etc/GMT+1 Etc/GMT+10 Etc/GMT+11 Etc/GMT+12 Etc/GMT+2 Etc/GMT+3 Etc/GMT+4 Etc/GMT+5 Etc/GMT+6 Etc/GMT+7 Etc/GMT+8 Etc/GMT+9 Etc/GMT-0 Etc/GMT-1 Etc/GMT-10 Etc/GMT-11 Etc/GMT-12 Etc/GMT-13 Etc/GMT-14 Etc/GMT-2 Etc/GMT-3 Etc/GMT-4 Etc/GMT-5 Etc/GMT-6 Etc/GMT-7 Etc/GMT-8 Etc/GMT-9 Etc/GMT0 Etc/Greenwich Etc/UCT Etc/UTC Etc/Universal Etc/Zulu Europe/Amsterdam Europe/Andorra Europe/Astrakhan Europe/Athens Europe/Belfast Europe/Belgrade Europe/Berlin Europe/Bratislava Europe/Brussels Europe/Bucharest Europe/Budapest Europe/Busingen Europe/Chisinau Europe/Copenhagen Europe/Dublin Europe/Gibraltar Europe/Guernsey Europe/Helsinki Europe/Isle_of_Man Europe/Istanbul Europe/Jersey Europe/Kaliningrad Europe/Kiev Europe/Kirov Europe/Kyiv Europe/Lisbon Europe/Ljubljana Europe/London Europe/Luxembourg Europe/Madrid Europe/Malta Europe/Mariehamn Europe/Minsk Europe/Monaco Europe/Moscow Europe/Nicosia Europe/Oslo Europe/Paris Europe/Podgorica Europe/Prague Europe/Riga Europe/Rome Europe/Samara Europe/San_Marino Europe/Saratov Europe/Simferopol Europe/Skopje Europe/Sofia Europe/Stockholm Europe/Tallinn Europe/Tirane Europe/Tiraspol Europe/Ulyanovsk Europe/Uzhgorod Europe/Vaduz Europe/Vatican Europe/Vienna Europe/Vilnius Europe/Volgograd Europe/Warsaw Europe/Zagreb Europe/Zaporizhzhia Europe/Zurich GB GB-Eire GMT GMT+0 GMT-0 GMT0 Greenwich Hong Kong Iceland Indian/Antananarivo Indian/Chagos Indian/Christmas Indian/Cocos Indian/Comoro Indian/Kerguelen Indian/Mahe Indian/Maldives Indian/Mauritius Indian/Mayotte Indian/Reunion Iran Israel Jamaica Japan Kwajalein Libya MET MST MST7MDT Mexico/BajaNorte Mexico/BajaSur Mexico/General NZ NZ-CHAT Navajo PRC PST8PDT Pacific/Apia Pacific/Auckland Pacific/Bougainville Pacific/Chatham Pacific/Chuuk Pacific/Easter Pacific/Efate Pacific/Enderbury Pacific/Fakaofo Pacific/Fiji Pacific/Funafuti Pacific/Galapagos Pacific/Gambier Pacific/Guadalcanal Pacific/Guam Pacific/Honolulu Pacific/Johnston Pacific/Kanton Pacific/Kiritimati Pacific/Kosrae Pacific/Kwajalein Pacific/Majuro Pacific/Marquesas Pacific/Midway Pacific/Nauru Pacific/Niue Pacific/Norfolk Pacific/Noumea Pacific/Pago_Pago Pacific/Palau Pacific/Pitcairn Pacific/Pohnpei Pacific/Ponape Pacific/Port_Moresby Pacific/Rarotonga Pacific/Saipan Pacific/Samoa Pacific/Tahiti Pacific/Tarawa Pacific/Tongatapu Pacific/Truk Pacific/Wake Pacific/Wallis Pacific/Yap Poland Portugal ROC ROK Singapore SystemV/AST4 SystemV/AST4ADT SystemV/CST6 SystemV/CST6CDT SystemV/EST5 SystemV/EST5EDT SystemV/HST10 SystemV/MST7 SystemV/MST7MDT SystemV/PST8 SystemV/PST8PDT SystemV/YST9 SystemV/YST9YDT Turkey UCT US/Alaska US/Aleutian US/Arizona US/Central US/East-Indiana US/Eastern US/Hawaii US/Indiana-Starke US/Michigan US/Mountain US/Pacific US/Pacific-New US/Samoa UTC Universal W-SU WET Zulu`;
// The Unix local-zone helper: the TZ env var (an IANA name, ':name' or a
// path), else the /etc/localtime symlink's target after zoneinfo/
const LOCAL_ZONE_UNIX = `func tnTemporalSystemZoneID() string {
	if tz := os.Getenv("TZ"); tz != "" {
		name := strings.TrimPrefix(tz, ":")
		if !strings.HasPrefix(name, "/") {
			if _, err := time.LoadLocation(name); err == nil {
				return name
			}
		}
		if id, ok := tnTemporalZoneIDFromPath(name); ok {
			return id
		}
		return "UTC"
	}
	if id, ok := tnTemporalZoneIDFromPath("/etc/localtime"); ok {
		return id
	}
	return "UTC"
}

// A symlink's target as an IANA id (/usr/share/zoneinfo/America/New_York)
func tnTemporalZoneIDFromPath(path string) (string, bool) {
	target, err := os.Readlink(path)
	if err != nil {
		return "", false
	}
	if i := strings.LastIndex(target, "/zoneinfo/"); i >= 0 {
		return target[i+len("/zoneinfo/"):], true
	}
	return "", false
}`;
// The Windows local-zone helper: the registry's TimeZoneKeyName mapped
// through CLDR's windowsZones table
const LOCAL_ZONE_WINDOWS = `func tnTemporalSystemZoneID() string {
	if tz := os.Getenv("TZ"); tz != "" {
		name := strings.TrimPrefix(tz, ":")
		if !strings.HasPrefix(name, "/") {
			if _, err := time.LoadLocation(name); err == nil {
				return name
			}
		}
		return "UTC"
	}
	if name := tnTemporalWindowsZoneName(); name != "" {
		if id, ok := tnTemporalWindowsZones[name]; ok {
			return id
		}
		if _, err := time.LoadLocation(name); err == nil {
			return name
		}
	}
	return "UTC"
}

var tnTemporalWindowsZones = map[string]string{
\${WINDOWS_ZONES_TABLE}
}

// HKLM\\...\\TimeZoneInformation's TimeZoneKeyName (the zone the user chose)
func tnTemporalWindowsZoneName() string {
	var key syscall.Handle
	err := syscall.RegOpenKeyEx(syscall.HKEY_LOCAL_MACHINE, syscall.StringToUTF16Ptr("SYSTEM\\\\CurrentControlSet\\\\Control\\\\TimeZoneInformation"), 0, syscall.KEY_READ, &key)
	if err != nil {
		return ""
	}
	defer syscall.RegCloseKey(key)
	var buf [256]uint16
	n := uint32(len(buf) * 2)
	err = syscall.RegQueryValueEx(key, syscall.StringToUTF16Ptr("TimeZoneKeyName"), nil, nil, (*byte)(unsafe.Pointer(&buf[0])), &n)
	if err != nil || n < 2 {
		return ""
	}
	return syscall.UTF16ToString(buf[:n/2])
}`;
// Builds the Go map literal from the CLDR table
function windowsZonesTable() {
    let out = '';
    for (const [name, id] of WINDOWS_ZONES)
        out += `\t${JSON.stringify(name)}: ${JSON.stringify(id)},\n`;
    return out;
}
export function registerTemporalZones(r) {
    for (const goos of ['linux', 'darwin', 'freebsd', 'openbsd', 'netbsd', 'dragonfly', 'solaris', 'illumos', 'aix']) {
        defineHelper(r, `nodeTemporalLocalZone@${goos}`, ['os', 'strings', 'time'], [], LOCAL_ZONE_UNIX);
    }
    defineHelper(r, 'nodeTemporalLocalZone@other', ['os', 'strings', 'time'], [], LOCAL_ZONE_UNIX);
    defineHelper(r, 'nodeTemporalLocalZone@windows', ['os', 'strings', 'syscall', 'time', 'unsafe'], [], LOCAL_ZONE_WINDOWS.replace('${WINDOWS_ZONES_TABLE}', windowsZonesTable()));
    defineHelper(r, 'nodeTemporalZones', ['strings', 'sync', 'time'], ['nodeTemporalLocalZone@os', 'error'], zonesHelper);
}
const zonesHelper = `// Temporal time zones: fixed offsets, IANA zones (case-insensitive ids),
// offsets at instants, the possible instants of a local time, the
// disambiguation modes and the zone transitions.

var tnTemporalZoneLookup = map[string]string{}

func init() {
	for _, name := range strings.Fields(tnTemporalZoneNames) {
		tnTemporalZoneLookup[strings.ToLower(name)] = name
	}
}

const tnTemporalZoneNames = "${IANA_ZONES}"

// A time zone: UTC, a fixed offset, or an IANA zone
type tnTemporalTZ struct {
	id       string
	fixed    bool
	offsetNs int64
	loc      *time.Location
}

var tnTemporalLocalOnce sync.Once
var tnTemporalLocalTZ *tnTemporalTZ

// Temporal.Now's zone: the system zone (also what a missing timeZone
// argument means)
func TnTemporalLocalZone() *tnTemporalTZ {
	tnTemporalLocalOnce.Do(func() {
		tnTemporalLocalTZ = TnTemporalTimeZoneOf(tnTemporalSystemZoneID())
	})
	return tnTemporalLocalTZ
}

// A zone id as TnTemporalTimeZoneOf leaves it: 'UTC', '+05:30' or the
// canonical IANA name
func (tz *tnTemporalTZ) String() string { return tz.id }

// A time zone id: 'UTC' (any case), ±HH:MM / ±HHMM / ±HH, or an IANA name
// matched case-insensitively (spaces stand for underscores)
func TnTemporalTimeZoneOf(id string) *tnTemporalTZ {
	if id == "UTC" || strings.EqualFold(id, "UTC") {
		return &tnTemporalTZ{id: "UTC", fixed: true}
	}
	if tz := tnTemporalOffsetZone(id); tz != nil {
		return tz
	}
	if canon, ok := tnTemporalZoneLookup[strings.ToLower(strings.ReplaceAll(strings.TrimSpace(id), " ", "_"))]; ok {
		loc, err := time.LoadLocation(canon)
		if err == nil {
			return &tnTemporalTZ{id: canon, loc: loc}
		}
	}
	panic(TnNodeError("RangeError", "", "Invalid time zone"))
}

// An offset zone: ±HH[:MM[:]] with hours 0-23 and minutes 0-59, its id
// normalized to ±HH:MM
func tnTemporalOffsetZone(id string) *tnTemporalTZ {
	if len(id) < 3 || (id[0] != '+' && id[0] != '-') {
		return nil
	}
	sign := int64(1)
	if id[0] == '-' {
		sign = -1
	}
	rest := id[1:]
	var hPart, mPart string
	switch {
	case len(rest) == 2:
		hPart, mPart = rest, "0"
	case len(rest) == 4:
		hPart, mPart = rest[:2], rest[2:]
	case len(rest) == 5 && rest[2] == ':':
		hPart, mPart = rest[:2], rest[3:]
	default:
		return nil
	}
	for _, c := range hPart + mPart {
		if c < '0' || c > '9' {
			return nil
		}
	}
	h := tnTemporalParseInt(hPart)
	m := tnTemporalParseInt(mPart)
	if h > 23 || m > 59 {
		panic(TnNodeError("RangeError", "", "Invalid time zone"))
	}
	return &tnTemporalTZ{id: id[:1] + hPart + ":" + mPart, fixed: true, offsetNs: sign * (int64(h)*3600 + int64(m)*60) * 1000000000}
}

func tnTemporalParseInt(s string) int {
	v := 0
	for _, c := range s {
		v = v*10 + int(c-'0')
	}
	return v
}

// A zone's offset, in seconds, at an instant
func (tz *tnTemporalTZ) offsetSecAt(sec int64, nsec int32) int64 {
	if tz.fixed {
		return tz.offsetNs / 1000000000
	}
	_, off := time.Unix(sec, int64(nsec)).In(tz.loc).Zone()
	return int64(off)
}

// GetPossibleEpochNanoseconds: the instants a local time can mean, in
// absolute order (empty in a DST gap, two in an overlap)
func (tz *tnTemporalTZ) possibleInstants(localSec int64, nsec int32) []*TnTemporalInstant {
	if tz.fixed {
		return []*TnTemporalInstant{{sec: localSec - tz.offsetNs/1000000000, nsec: nsec}}
	}
	// The offsets one day on either side bracket any transition (transitions
	// are never more than a day apart), so the candidates they give are the
	// full set; each is kept only when the zone really has that offset there
	before := tz.offsetSecAt(localSec-86400, nsec)
	after := tz.offsetSecAt(localSec+86400, nsec)
	first, second := before, after
	if after > before {
		first, second = after, before
	}
	var out []*TnTemporalInstant
	for _, off := range []int64{first, second} {
		cand := localSec - off
		if tz.offsetSecAt(cand, nsec) != off {
			continue
		}
		inst := &TnTemporalInstant{sec: cand, nsec: nsec}
		if len(out) == 0 || out[len(out)-1].sec != cand {
			out = append(out, inst)
		}
	}
	return out
}

// DisambiguatePossibleEpochNanoseconds: a unique instant as itself; in an
// overlap 'compatible' and 'earlier' take the earlier instant and 'later'
// the other; in a gap 'compatible' and 'later' skip forward and 'earlier'
// takes the same wall time under the post-transition offset
func (tz *tnTemporalTZ) resolveInstant(localSec int64, nsec int32, mode string) *TnTemporalInstant {
	cands := tz.possibleInstants(localSec, nsec)
	switch len(cands) {
	case 1:
		return cands[0]
	case 2:
		switch mode {
		case "earlier", "compatible":
			return cands[0]
		case "later":
			return cands[1]
		}
		panic(TnNodeError("RangeError", "", "Multiple possible instants"))
	default:
		offBefore := tz.offsetSecAt(localSec-86400, nsec)
		offAfter := tz.offsetSecAt(localSec+86400, nsec)
		if mode == "earlier" {
			return &TnTemporalInstant{sec: localSec - offAfter, nsec: nsec}
		}
		if mode == "compatible" || mode == "later" {
			return &TnTemporalInstant{sec: localSec - offBefore, nsec: nsec}
		}
		panic(TnNodeError("RangeError", "", "No such instant exists in this time zone"))
	}
	return nil
}

// The next offset change after an instant ('next'), or the most recent one
// before it ('previous'); nil past the tzdata's first or last transition.
// ZoneBounds' bounds are only candidates: the embedded tzdata's first year
// starts with a boundary at which the offset does not change (and an instant
// can sit exactly on a boundary), so walk until one really changes.
func (tz *tnTemporalTZ) zoneTransition(inst *TnTemporalInstant, next bool) *TnTemporalInstant {
	if tz.fixed {
		return nil
	}
	t := time.Unix(inst.sec, int64(inst.nsec)).In(tz.loc)
	for i := 0; i < 100000; i++ {
		var bound time.Time
		if next {
			_, bound = t.ZoneBounds()
		} else {
			bound, _ = t.ZoneBounds()
		}
		if bound.IsZero() {
			return nil
		}
		if !next && bound.Unix() == t.Unix() && bound.Nanosecond() == t.Nanosecond() {
			// (on the boundary itself: look at the interval before it)
			t = bound.Add(-time.Nanosecond)
			continue
		}
		before := bound.Add(-time.Nanosecond).In(tz.loc)
		_, offBefore := before.Zone()
		_, offAt := bound.In(tz.loc).Zone()
		if offBefore == offAt {
			// (a boundary where nothing changes: keep walking)
			if next {
				t = bound
			} else {
				t = before
			}
			continue
		}
		return tnTemporalInstantOfTime(bound)
	}
	return nil
}

func tnTemporalInstantOfTime(t time.Time) *TnTemporalInstant {
	return &TnTemporalInstant{sec: t.Unix(), nsec: int32(t.Nanosecond())}
}`;
