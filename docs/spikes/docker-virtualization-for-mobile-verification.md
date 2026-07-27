# 스파이크: Docker/컨테이너 가상화로 iOS·Android 실기기(런타임) 검증이 가능한가

## 배경/질문

지금까지 이 프로젝트의 모바일 검증 한계는 다음과 같이 정리되어 있었다 (`docs/agents/leader-log.md` 2026-07-24~25 항목):

- **Android**: `./gradlew assembleDebug`로 "빌드 성공"까지만 확인. 에뮬레이터/실기기에 실제로 설치해서 화면이 뜨고 상호작용되는지는 Round 1~14 전체에서 한 번도 확인한 적 없음.
- **iOS**: macOS 부재로 Xcode/시뮬레이터 자체가 구조적으로 불가능. 리더가 이미 GitHub Actions macOS 러너 / EAS Build / Codemagic / 클라우드 Mac 임대 4가지 클라우드 대안을 조사·보고했고, 사용자가 "추후 논의로 보류"함.

이번 요청은 그 4가지 클라우드 대안과 무관하게 **"로컬 Docker/컨테이너 가상화로 가능한가"**라는 좁은 질문에 한정된다.

## 방법

- **Android**: 문서/사례 조사에 그치지 않고, 이 머신(Windows 11 Pro, build 26200, AMD Ryzen 5 7500F, Docker Desktop 29.2.0, WSL2 backend, Docker Engine)에서 실제로 `budtmo/docker-android` 이미지를 pull → 컨테이너 실행 → 에뮬레이터 부팅 → 실제 프로젝트 debug APK(GitHub Release `android-debug-latest`, `com.mobile`, 130MB) 설치 → 실행 → 화면 캡처까지 **엔드투엔드 실측**을 수행했다.
- **iOS**: 실측이 원리적으로 불가능한 질문(호스트가 Windows인 이상 macOS 커널을 컨테이너 안에서 돌릴 방법 자체가 없음)이므로, 컨테이너/VM 기술 문서와 Apple 공식 라이선스 문서(SLA PDF), 커뮤니티 사례(`docker-osx`)를 조사하는 방식으로 진행했다.

## 1. Android — Docker 기반 에뮬레이터 실현 가능성

### 결론 먼저: 이 머신에서는 실제로 됐다 (실측 완료)

핵심 우려였던 "Docker Desktop의 WSL2 VM 안에 또 Android 에뮬레이터용 하드웨어 가상화를 중첩(nested virtualization)해야 하는 구조"가 실제로 동작하는지를 직접 확인했다.

**실측 절차와 결과:**

1. `/dev/kvm`이 이 머신의 WSL2(Ubuntu) 안에 이미 노출되어 있음을 확인 (`crw-rw---- root kvm 10, 232 /dev/kvm`, CPU flag에 `svm`/`npt`/`vmmcall` 등 AMD-V 관련 플래그 존재, `lscpu` 기준 `Virtualization: AMD-V (full)`). 별도 `.wslconfig` 설정(`nestedVirtualization=true`) 없이도 이미 노출된 상태였다.
2. Docker Desktop 컨테이너에 `--device /dev/kvm`으로 통과시키는 것도 성공 확인 (`docker run --rm --device /dev/kvm alpine ls -la /dev/kvm` → 정상 출력).
3. `budtmo/docker-android:emulator_11.0` 이미지(compressed 약 2.9GB)를 pull → 약 3분 소요.
4. `docker run -d --device /dev/kvm -p 6080:6080 -p 5554:5554 -p 5555:5555 -e EMULATOR_DEVICE="Samsung Galaxy S10" budtmo/docker-android:emulator_11.0` 로 컨테이너 기동.
5. 컨테이너 내부 로그(`device.stdout.log`)에서 하드웨어 가속이 실제로 사용됨을 명시적으로 확인:
   - `CPU Acceleration: working`
   - `CPU Acceleration status: KVM (version 12) is installed and usable.`
   - qemu 실행 커맨드에 `-enable-kvm` 포함 (소프트웨어 에뮬레이션 폴백이 아님)
   - `Boot completed in 36052 ms` (에뮬레이터 커널 자체 부팅 시간, 컨테이너 기동 포함 전체 체감 시간은 약 1~2분)
6. `adb devices` → `emulator-5554  device` (오프라인 아님, 정상 사용 가능 상태).
7. `adb shell am start -a android.settings.SETTINGS` + `input tap` + `screencap`으로 실제 UI 스크린샷을 뽑아 렌더링·터치 이벤트 주입이 실제로 동작함을 시각적으로 확인.
8. **이 프로젝트의 실제 릴리즈 APK**(`feel-music-share-debug.apk`, GitHub Release `android-debug-latest`)를 컨테이너로 복사 후 `adb install -r` → `Success`. `adb shell monkey -p com.mobile ...`로 앱 런처 실행 → 스크린샷 결과 온보딩 화면("같은 곡을, 같은 순간에 / 멀리 있어도 함께 듣는 방을 만들어보세요.")이 **한글 폰트 포함 정상 렌더링**된 것을 확인. 즉 "빌드 성공"을 넘어 "설치 → 실행 → 실제 화면 렌더링"까지 실측했다.
9. 리소스 사용량: `docker stats` 기준 컨테이너 CPU 12.53%, 메모리 4.56GiB(호스트 총 15.43GiB 컨테이너 한도 기준 29.58%). 에뮬레이터 하나 기준으로는 가볍게 여유 있는 수준.

### 이게 왜 됐는지 (배경 조사)

- WSL2는 최근 커널 버전에서 `/dev/kvm`을 자체적으로 노출하는 기능을 갖고 있고, Windows 11에서는 `.wslconfig`의 `[wsl2] nestedVirtualization=true` 플래그로 이를 제어할 수 있다는 것이 Microsoft/커뮤니티 문서에서 확인된다. 다만 이 머신에서는 해당 플래그를 명시적으로 설정한 적이 없는데도 기본으로 켜져 있었다 — Windows 11 build 26200(비교적 최신 빌드)과 WSL 2.6.3.0 조합에서는 기본값이 이미 활성화 상태인 것으로 보인다.
- 반대로 [microsoft/WSL#9201 "Nested virtualization is not enabled on this OS build"](https://github.com/microsoft/WSL/issues/9201)처럼 OS 빌드에 따라 중첩 가상화가 아예 막혀 있는 경우도 보고된다. 즉 **"Docker로 Android 런타임 검증이 되는지"는 일반적으로 보장된 것이 아니라 호스트 CPU(Intel VT-x/AMD-V 지원 및 BIOS 활성화), Windows 에디션/빌드, WSL 버전 조합에 의존하는 환경 특이적 결과**다. 이번 실측은 "이 사용자의 이 머신에서는 된다"는 것을 증명한 것이지 "모든 Windows 환경에서 항상 된다"는 보장은 아니다.
- 커뮤니티 자료([shincbm 블로그](https://www.shincbm.com/linux/kvm/wsl2/macos/android/2021/10/24/wsl2-kvm-mac-android.html), [budtmo/docker-android 공식 저장소](https://github.com/budtmo/docker-android))에서도 WSL2+KVM 조합으로 컨테이너 기반 Android 에뮬레이터를 구동하는 사례가 존재함을 확인했다. 다만 일부 커뮤니티 가이드는 "WSL2 내부에서 직접 에뮬레이터를 돌리는 것보다 Windows에서 네이티브로 에뮬레이터를 띄우고 WSL2에서 `adb connect`로 붙는 방식을 권장"한다는 신중한 의견도 있었다("성능 이슈 가능성" 경고) — 그러나 이번 실측에서는 부팅 36초, CPU 12%대로 체감상 문제없는 성능이 나왔다.
- [budtmo/docker-android 이슈 #247](https://github.com/budtmo/docker-android/issues/247), [#405](https://github.com/budtmo/docker-android/issues/405) 등에서 KVM 미지원/중첩 가상화 실패로 부팅이 안 되는 사례들도 다수 보고되어 있어, 이 구성이 "다들 겪는 흔한 실패 포인트"이기도 하다는 점도 확인된다.

### 실현 가능성 평가 (설정 복잡도/성능/신뢰도)

| 항목 | 평가 |
|---|---|
| 설정 복잡도 | 이 머신 기준으로는 낮음(추가 설정 없이 됨) — 단 다른 환경에서는 `.wslconfig` nestedVirtualization, BIOS 가상화 활성화, WSL 최신 버전 업데이트가 필요할 수 있고 이게 항상 성공한다는 보장은 없음 |
| 성능 | 실측상 양호(부팅 36초, CPU/메모리 여유 있음) — KVM 가속이 걸렸을 때 기준. 가속이 안 걸리면(중첩 가상화 실패) 소프트웨어 에뮬레이션으로 폴백되어 사실상 사용 불가 수준으로 느려지거나 아예 부팅 안 될 수 있음(문서상 확인, 이번엔 재현하지 않음) |
| 이식성/재현성 | 낮음 — 이 결과가 다른 개발자 머신·CI 러너에서도 재현된다는 보장이 없음(CPU/BIOS/Windows 빌드 의존) |
| 대비 기존 대안(로컬 AVD) | 이번 기회에 확인해보니 로컬 Android SDK에 emulator 컴포넌트가 이미 설치되어 있고 AVD(`Medium_Phone_API_36.1`)도 이미 구성되어 있음(`E:\Android\Sdk\emulator\emulator.exe -list-avds`로 확인, 실제 부팅은 시도하지 않음). Docker보다 설정 레이어가 하나 적어(WSL2 중첩 가상화 문제 자체가 없음) 더 직접적인 대안일 가능성이 큼 — 단, 이번 스파이크의 본질문은 아니므로 실측은 하지 않았다. |

## 2. iOS — Docker/컨테이너로 macOS를 흉내낼 방법이 있는가

### 기술적 이유: 컨테이너는 원리적으로 다른 커널을 담을 수 없다

- Docker/컨테이너 기술은 **호스트 커널의 네임스페이스·cgroups 기능을 격리 단위로 재사용**하는 방식이다. 즉 컨테이너 안에서 도는 프로세스는 항상 호스트와 같은 커널 위에서 실행된다. macOS 커널(XNU)은 Linux/Windows 커널과 별개의 커널이므로, Windows나 Linux 호스트의 컨테이너 안에서 macOS 프로세스를 "컨테이너"로 격리 실행하는 것은 애초에 컨테이너라는 기술의 정의 자체와 모순된다.
- 이는 macOS 자체에서 Docker Desktop이 왜 내부적으로 리눅스 VM을 하나 띄우고 그 안에서 리눅스 컨테이너를 돌리는지(즉 macOS 위에서도 "리눅스 컨테이너"만 돌 뿐 "macOS 컨테이너"는 없는지)와 같은 근본 원리다.
- 결론: **Windows/Linux 호스트에서 Docker로 macOS를 실행하는 것은 컨테이너 기술 자체의 정의상 불가능**하다 — 이는 설정이나 성능 문제가 아니라 구조적 불가능이다.

### 라이선스 제약: 기술과 별개로 존재

- Apple 공식 macOS SLA([macOS Sequoia 라이선스 PDF](https://www.apple.com/legal/sla/docs/macOSSequoia.pdf))는 가상화 허용 조항(2B(iii))에서 "**각 애플 브랜드 컴퓨터(each Apple-branded computer)**에서" 최대 2개의 macOS 인스턴스를 가상 환경에서 돌릴 수 있다고 명시한다. 즉 **macOS를 가상화하는 행위 자체는 (기술적으로 가능하다 해도) Apple 하드웨어 위에서만 라이선스로 허용**되며, Windows PC 같은 비-Apple 하드웨어에서 macOS를 VM으로 돌리는 것은 기술과 무관하게 SLA 위반이다.
- 즉 이 프로젝트 맥락에서는 기술적 불가능(컨테이너=커널 공유 구조라 macOS 커널 자체를 못 돌림)이 1차 장벽이고, 설령 QEMU 같은 전가상화 VM으로 macOS 커널을 통째로 돌리는 게 기술적으로 가능하다 해도(아래 참고) 그 시점에 라이선스 장벽이 별도로 존재한다.

### `docker-osx` 프로젝트 확인 결과: 이름과 실제 작동 방식의 괴리

- [`sickcodes/Docker-OSX`](https://github.com/sickcodes/Docker-OSX)(및 포크인 `madhuakula/Docker-OSX`) 프로젝트를 확인했다. 설명 문구 자체가 "Run near native **OSX-KVM** in Docker!"로, **Docker는 QEMU/KVM 기반의 완전한 가상 머신(하드웨어 전체를 에뮬레이션하는 전가상화)을 감싸는 실행 래퍼일 뿐**이라는 점이 README에 명시되어 있다.
- 즉 이름은 "Docker-OSX"지만 실제로는 (1) Docker는 QEMU 프로세스를 실행하기 위한 편의 레이어(의존성 패키징, 실행 스크립트 배포)일 뿐이고, (2) 실제 macOS를 구동하는 것은 컨테이너의 네임스페이스 격리가 아니라 **QEMU가 하드웨어 전체(디스크, CPU 명령어셋, 펌웨어 등)를 에뮬레이션·가상화하는 전통적인 VM 방식**이다. "컨테이너 안에서 macOS가 컨테이너로 돈다"는 것이 아니라 "컨테이너 런처가 VM 하나를 띄운다"는 개념이다.
- 이건 원래 Linux 호스트(리눅스 커널 위에서 KVM으로 macOS 게스트를 도는) 프로젝트로 설계되었고, Windows 호스트에서의 활용은 조사 범위에서 명시적으로 검증되지 않았다(README/이슈 상 리눅스 중심). Windows에서 시도한다 해도 WSL2 안에 KVM을 얹고 그 위에 다시 macOS x86_64 게스트를 얹는 다중 중첩 구조가 되어 설정 난이도·성능·(가장 중요하게는) 라이선스 문제가 그대로 남는다.
- **결론적으로 `docker-osx`는 "Docker로 iOS/macOS 검증이 가능하다"는 근거가 되지 못한다** — Docker라는 이름을 쓰지만 본질은 QEMU 전가상화 VM이고, 그 전가상화조차 Apple SLA로 비-Apple 하드웨어에서는 허용되지 않는다.

### 종합

Windows 호스트에서 Docker(또는 어떤 컨테이너 기술이든)로 iOS 검증 환경을 만드는 것은:
1. **기술적으로 원리상 불가능**(컨테이너=커널 공유 구조, macOS는 다른 커널)
2. 설령 QEMU 같은 별도 전가상화 VM으로 우회한다 해도 **Apple SLA가 비-Apple 하드웨어에서의 macOS 가상화를 금지**
두 가지 독립적인 장벽이 동시에 존재한다. "극히 제한적으로라도 되는 경우"는 조사 범위에서 발견하지 못했다.

## 참고용 결론 (리더/사용자 판단용 — 결정 아님)

- **Android**: 이 특정 머신에서는 Docker 기반 에뮬레이터로 "빌드를 넘어선 설치·실행·상호작용 검증"이 실측으로 확인됐다. 다만 재현성이 이 머신에 종속적이라는 한계가 있고, 로컬 AVD(Docker 없이 이미 설치되어 있음)가 설정 레이어가 적어 더 간단한 대안일 가능성이 있다. 어느 쪽을 정식 검증 파이프라인에 채택할지는 verifier/구현 로드맵 논의로 넘긴다.
- **iOS**: Docker/로컬 컨테이너 가상화로는 기술적·라이선스적으로 이중으로 막혀 있어, 이번 조사로 "로컬 Docker 경로는 없다"는 것이 명확해졌다. 기존에 리더가 조사해둔 클라우드 대안(GitHub Actions macOS 러너/EAS Build/Codemagic/클라우드 Mac 임대) 논의를 재개하는 것이 유일한 실행 가능 경로로 보인다 — 단 이 판단 자체는 사용자가 이미 "추후 논의로 보류"한 사안이므로 이번 스파이크가 그 보류를 뒤집는 근거는 아니다.

## 부록: 실측 산출물

- 스크린샷(스파이크 세션 스크래치패드, 저장소에는 포함하지 않음): Docker 컨테이너 내 Android 11 에뮬레이터의 설정 앱 화면, 이 프로젝트 debug APK 온보딩 화면(한글 렌더링 확인).
- 사용한 이미지: `budtmo/docker-android:emulator_11.0` (Docker Hub, pull 완료 상태로 로컬 캐시에 남아있음 — 필요시 후속 스파이크/검증에 재사용 가능).
- 스파이크 종료 시 테스트 컨테이너(`android-spike-test`)는 정지·삭제 완료. 이미지 자체는 로컬 Docker 캐시에 남겨둠(재실측 시 재사용 목적, 필요 없으면 `docker rmi budtmo/docker-android:emulator_11.0`로 정리 가능 — 약 8GB 언팩 사이즈).
