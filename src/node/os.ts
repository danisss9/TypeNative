// node:os — operating system information (Node's names for platform / arch / type)

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const osHelper = `// node:os
func TnOsArch() string {
	switch runtime.GOARCH {
	case "amd64":
		return "x64"
	case "386":
		return "ia32"
	case "ppc64le":
		return "ppc64"
	}
	return runtime.GOARCH
}

func TnOsType() string {
	switch runtime.GOOS {
	case "windows":
		return "Windows_NT"
	case "linux":
		return "Linux"
	case "darwin":
		return "Darwin"
	case "freebsd":
		return "FreeBSD"
	case "openbsd":
		return "OpenBSD"
	case "netbsd":
		return "NetBSD"
	}
	return runtime.GOOS
}

func TnOsMachine() string {
	switch runtime.GOARCH {
	case "amd64":
		return "x86_64"
	case "386":
		return "i686"
	case "arm64":
		if runtime.GOOS == "darwin" {
			return "arm64"
		}
		return "aarch64"
	case "arm":
		return "armv7l"
	}
	return runtime.GOARCH
}

func TnOsEOL() string {
	if runtime.GOOS == "windows" {
		return "\\r\\n"
	}
	return "\\n"
}

func TnOsDevNull() string {
	if runtime.GOOS == "windows" {
		return "\\\\\\\\.\\\\nul"
	}
	return "/dev/null"
}

func TnOsHostname() string {
	h, _ := os.Hostname()
	return h
}

func TnOsHomedir() string {
	h, _ := os.UserHomeDir()
	return h
}

// os.tmpdir(): without a trailing separator
func TnOsTmpdir() string {
	d := os.TempDir()
	if len(d) > 1 && (strings.HasSuffix(d, "/") || strings.HasSuffix(d, "\\\\")) && !strings.HasSuffix(d, ":\\\\") {
		d = d[:len(d)-1]
	}
	return d
}

func TnOsEndianness() string {
	var probe uint16 = 1
	if binary.NativeEndian.Uint16([]byte{1, 0}) == probe {
		return "LE"
	}
	return "BE"
}

type TnUserInfo struct {
	username string
	uid      float64
	gid      float64
	shell    *string
	homedir  string
}

func TnOsUserInfo() *TnUserInfo {
	u, err := user.Current()
	if err != nil {
		panic(TnNodeError("SystemError", "ERR_SYSTEM_ERROR", err.Error()))
	}
	info := &TnUserInfo{username: u.Username, uid: -1, gid: -1, homedir: u.HomeDir}
	if runtime.GOOS == "windows" {
		if i := strings.LastIndex(info.username, "\\\\"); i >= 0 {
			info.username = info.username[i+1:]
		}
	} else {
		if n, err := strconv.Atoi(u.Uid); err == nil {
			info.uid = float64(n)
		}
		if n, err := strconv.Atoi(u.Gid); err == nil {
			info.gid = float64(n)
		}
		shell := os.Getenv("SHELL")
		info.shell = &shell
	}
	return info
}

type TnCpuTimes struct {
	user float64
	nice float64
	sys  float64
	idle float64
	irq  float64
}

type TnCpuInfo struct {
	model string
	speed float64
	times *TnCpuTimes
}

// os.cpus(): one entry per logical CPU (model / speed / times are not portable in Go)
func TnOsCpus() []*TnCpuInfo {
	out := make([]*TnCpuInfo, runtime.NumCPU())
	for i := range out {
		out[i] = &TnCpuInfo{times: &TnCpuTimes{}}
	}
	return out
}

type TnNetworkInterfaceInfo struct {
	address  string
	netmask  string
	family   string
	mac      string
	internal bool
	cidr     string
	scopeid  float64
}

func TnOsNetworkInterfaces() *TnMap[string, []*TnNetworkInterfaceInfo] {
	out := TnNewMap[string, []*TnNetworkInterfaceInfo]()
	ifaces, err := net.Interfaces()
	if err != nil {
		return out
	}
	for _, iface := range ifaces {
		addrs, err := iface.Addrs()
		if err != nil || len(addrs) == 0 {
			continue
		}
		list := []*TnNetworkInterfaceInfo{}
		for _, addr := range addrs {
			ipnet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}
			info := &TnNetworkInterfaceInfo{
				address:  ipnet.IP.String(),
				netmask:  net.IP(ipnet.Mask).String(),
				family:   "IPv6",
				mac:      iface.HardwareAddr.String(),
				internal: iface.Flags&net.FlagLoopback != 0,
				cidr:     ipnet.String(),
			}
			if ipnet.IP.To4() != nil {
				info.family = "IPv4"
				info.netmask = net.IP(ipnet.Mask).To4().String()
				if len(ipnet.Mask) == 16 {
					info.netmask = net.IP(ipnet.Mask[12:]).String()
				}
			}
			if info.mac == "" {
				info.mac = "00:00:00:00:00:00"
			}
			list = append(list, info)
		}
		if len(list) > 0 {
			out.Set(iface.Name, list)
		}
	}
	return out
}`;

const OS_SIGNALS: Record<string, number> = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGILL: 4,
  SIGTRAP: 5,
  SIGABRT: 6,
  SIGBUS: 7,
  SIGFPE: 8,
  SIGKILL: 9,
  SIGUSR1: 10,
  SIGSEGV: 11,
  SIGUSR2: 12,
  SIGPIPE: 13,
  SIGALRM: 14,
  SIGTERM: 15
};

export function registerOs(r: NodeRegistry): void {
  defineModule(r, 'os');
  defineHelper(r, 'nodeOs', ['encoding/binary', 'net', 'os', 'os/user', 'runtime', 'strconv', 'strings'], ['error', 'orderedMap'], osHelper);
  defineClass(r, 'os.UserInfo', '*TnUserInfo', 'class', '', 'username=string; uid=float64; gid=float64; shell=*string; homedir=string', '', '');
  defineClass(r, 'os.CpuInfo', '*TnCpuInfo', 'class', '', 'model=string; speed=float64; times=*TnCpuTimes', '', '');
  defineClass(r, 'os.CpuTimes', '*TnCpuTimes', 'class', '', 'user=float64; nice=float64; sys=float64; idle=float64; irq=float64', '', '');
  defineClass(
    r,
    'os.NetworkInterfaceInfo',
    '*TnNetworkInterfaceInfo',
    'class',
    '',
    'address=string; netmask=string; family=string; mac=string; internal=bool; cidr=string; scopeid=float64',
    '',
    ''
  );
  const call = (fn: string) => (_c: NodeCall) => {
    r.helper('nodeOs');
    return `${fn}()`;
  };
  r.functions['os.platform'] = (_c: NodeCall) => {
    r.helper('osPlatform');
    return 'TnOsPlatform()';
  };
  r.functions['os.arch'] = call('TnOsArch');
  r.functions['os.type'] = call('TnOsType');
  r.functions['os.machine'] = call('TnOsMachine');
  r.functions['os.hostname'] = call('TnOsHostname');
  r.functions['os.homedir'] = call('TnOsHomedir');
  r.functions['os.tmpdir'] = call('TnOsTmpdir');
  r.functions['os.endianness'] = call('TnOsEndianness');
  r.functions['os.userInfo'] = call('TnOsUserInfo');
  r.functions['os.cpus'] = call('TnOsCpus');
  r.functions['os.networkInterfaces'] = call('TnOsNetworkInterfaces');
  r.functions['os.availableParallelism'] = (_c: NodeCall) => {
    r.pkg('runtime');
    return 'float64(runtime.NumCPU())';
  };
  setResults(
    r,
    'os',
    'platform=string; arch=string; type=string; machine=string; hostname=string; homedir=string; tmpdir=string; endianness=string; userInfo=*TnUserInfo; cpus=[]*TnCpuInfo; networkInterfaces=*TnMap[string, []*TnNetworkInterfaceInfo]; availableParallelism=float64'
  );
  r.values['os.EOL'] = call('TnOsEOL');
  r.values['os.devNull'] = call('TnOsDevNull');
  r.valueTypes['os.EOL'] = 'string';
  r.valueTypes['os.devNull'] = 'string';
  r.objects['os.constants'] = true;
  r.objects['os.constants.signals'] = true;
  for (const name of Object.keys(OS_SIGNALS)) {
    const value = OS_SIGNALS[name];
    r.values[`os.constants.signals.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`os.constants.signals.${name}`] = 'float64';
  }
}
