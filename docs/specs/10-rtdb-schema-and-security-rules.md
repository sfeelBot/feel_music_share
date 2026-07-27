# 10. RTDB 트리 스키마 및 보안 규칙 설계

> 상태: v1 — 2026-07-27 초안, 같은 날 인증 방식 결정 완료(아래 참고)
> 목적: `docs/decision-log.md`(2026-07-27, RTDB 단일 구성 확정)와 `apps/mobile/src/services/firebase/firebaseClient.ts`(RTDB 인스턴스 연결 완료, 커밋 `58317c2`/`c43ceb6`)까지 진행된 상태에서, 인메모리 목업인 `apps/mobile/src/services/session/sessionService.ts`를 실제 RTDB 호출로 교체하기 **전에** 트리 구조와 보안 규칙을 먼저 설계한다. 코드는 작성하지 않는다(구현 에이전트 몫) — 이 문서는 설계와 선택지 비교, 로드맵 제안까지만 다룬다.
> **(2026-07-27 확정) 인증 방식: 시나리오 A(Firebase Auth 익명 인증) 채택** — 회의록: [`docs/decision-log.md`](../decision-log.md). 아래 "시나리오 A/B 비교"는 결정에 이르기까지의 비교 자료로 그대로 남겨두되, 실제 구현은 시나리오 A 기준으로 진행한다.

## 배경

- 지금까지 `sessionService.ts`는 완전한 인메모리 목업이다 — `Map<string, SessionState>` 하나로 세션 생성/조회/참여/플레이리스트 CRUD/서비스 전환/혼합 모드 매칭/권한 변경을 전부 처리해왔다(코드 검토 완료, 아래 "요구사항 3" 로드맵의 근거가 이 코드 전체 읽기다).
- RTDB 인스턴스(`asia-southeast1`)는 활성화됐지만 기본 잠금 규칙(`.read`/`.write` 둘 다 `false`) 그대로라 실제 read/write가 전부 거부된다(`docs/spikes/firebase-rtdb-vs-firestore.md` "2026-07-27 후속" 절, REST API 401 실측 확인).
- 이 프로젝트는 **Cloud Functions를 아직 쓰지 않는다** — `docs/decision-log.md`가 확정한 것은 "RTDB 단일 구성"이지, 서버리스 함수 계층 도입이 아니다. 즉 지금 시점에서 **RTDB 보안 규칙(security rules)이 사실상 유일한 서버측 검증 계층**이다. `sessionService.ts`에 지금 JS로 짜여 있는 검증 로직(정원 초과 거부, `platform_required` 반환, 관리자 임명은 방장만 등)은 클라이언트 프로세스 안에서만 도는 코드라 악의적 사용자가 RTDB SDK를 직접 호출하면 전부 우회된다 — 이 로직들 중 실제로 보안적으로 의미가 있으려면 **규칙 JSON으로도 동일하게 강제**해야 한다는 것이 이번 설계의 핵심 전제다("제약/리스크" 절에서 다시 강조).
- 이 문서가 참고한 기존 문서/코드: `docs/specs/05-sync-architecture.md`(서버 기준 시계 모델), `docs/specs/04-playlist.md`(플레이리스트 구조·권한 체계·세션 정원·Free 계정), `docs/specs/09-cross-platform-mixed-mode.md`(혼합 모드 이중 계층 데이터 모델), `apps/mobile/src/types/domain.ts`(클라이언트 타입), `apps/mobile/src/services/session/sessionService.ts`(현재 인메모리 구현 전체), `apps/mobile/src/state/SessionContext.tsx`(재생 조작 함수 `requestPlay/Pause/NextTrack/PrevTrack`가 현재 role 제한 없이 전원에게 열려 있음을 확인 — 04문서의 3단계 권한 체계는 "서비스 전환"에만 적용되고 재생 조작(play/pause 등) 권한은 아직 별도로 규정된 바 없다는 것과 일치, 04문서 "권한 체계" 절 참고).

## 요구사항 1 — RTDB 트리 스키마 설계

### 전체 트리 개요

```
/sessions
  /{sessionId}
    /meta
      sessionName: string
      service: "spotify" | "youtube" | "mixed"
      hostParticipantId: string
      capacity: number                 // 2~12, 생성 시점 고정(04문서 "세션 정원" 절, 2026-07-25 확정)
      inviteCode: string                // /inviteCodes 인덱스와 값 중복(비정규화, 아래 설명)
      createdAt: number                 // ServerValue.TIMESTAMP로 기록(아래 "서버 타임스탬프" 절)
    /participants
      /{participantId}
        displayName: string
        avatarUrl: string | null
        ringColor: string
        role: "host" | "admin" | "regular"
        accountTier: "premium" | "free"
        connectionStatus: "connected" | "reconnecting" | "disconnected"
        delaySeconds: number
        platform: "spotify" | "youtube" | null   // 혼합 세션에서만 값을 가짐
        joinedAt: number                          // ServerValue.TIMESTAMP
    /playlists
      /spotify
        /entries
          /{entryId}
            track: { serviceTrackId, title, artist, albumArtUrl, durationMs }
            addedByParticipantId: string
            addedByDisplayName: string
            addedAt: number              // ServerValue.TIMESTAMP
            playedStatus: "pending" | "playing" | "played"
            order: number                // 정렬 키, 아래 "정렬 키 설계" 절 참고
        /lastPlayback
          currentEntryId: string | null
          positionMs: number
      /youtube
        (spotify와 동일 구조)
    /mixedPlaylist
      /{entryId}
        title: string
        artist: string
        representativeThumbnailUrl: string | null
        representativeDurationMs: number
        addedByParticipantId: string
        addedByDisplayName: string
        addedAt: number                  // ServerValue.TIMESTAMP
        playedStatus: "pending" | "playing" | "played"
        order: number
        /matches
          /{participantId}
            status: "searching" | "matched" | "failed"
            confirmState: "pending" | "confirmed" | "manual"
            skipped: boolean
            track: { service, serviceTrackId, title, artist, albumArtUrl, durationMs, matchScore, confidenceLevel } | null
            /candidates
              /0, /1, /2, ...            // 또는 배열 — 아래 "candidates 표현" 절 참고
    /playback
      currentEntryId: string | null
      positionMs: number
      isPlaying: boolean
      serverTimestamp: number            // 반드시 ServerValue.TIMESTAMP — 아래 "서버 타임스탬프" 절(중요)
      updatedByParticipantId: string

/inviteCodes
  /{code} -> sessionId (string)
```

### 설계 근거 — 경로별 설명

**`/sessions/{sessionId}/meta`를 별도 하위 노드로 분리한 이유**: `SessionState`를 평평하게 `/sessions/{sessionId}` 바로 아래 모든 필드를 두지 않고 `meta`로 묶은 이유는, 아래 "요구사항 2"의 보안 규칙에서 "세션 고정 메타데이터"(정원·이름·서비스 등, 생성 후 거의 불변)와 "계속 갱신되는 하위 트리"(participants/playlists/playback)를 서로 다른 쓰기 규칙으로 다뤄야 하기 때문이다. 한 노드에 다 섞으면 "메타는 방장만 고칠 수 있어야 하는데 playback은 전원이 고칠 수 있어야 한다"는 요구를 규칙 하나로 표현하기 어려워진다.

**`participants`/`playlists.entries`/`mixedPlaylist`가 배열이 아니라 `{id}` 키의 맵인 이유**: RTDB는 배열을 1급 자료구조로 지원하지 않는다(공식 문서가 명시적으로 배열 사용을 비권장 — 원소 삭제 시 인덱스에 구멍이 생기고 이를 RTDB가 다시 객체로 취급해버리는 문제가 잘 알려져 있다). `entries`/`participants`/`matches`처럼 "키로 특정 원소를 직접 찾아 갱신/삭제"해야 하는 컬렉션은 전부 `{id: value}` 맵으로 설계했다 — 기존 인메모리 코드도 이미 `entryId`/`participantId`를 1급 식별자로 쓰고 있어(예: `removeTrack(sessionId, entryId)`) 자연스럽게 맵 구조로 옮겨간다.

**정렬 키(`order`) 설계 — 배열의 "순서"를 RTDB에서 어떻게 표현할지**

기존 인메모리 `reorderPlaylist(sessionId, orderedEntryIds: string[])`는 "전체 순서 배열을 통째로 새로 받아 통째로 교체"하는 방식이다. RTDB로 옮기면 이 방식은 두 가지 문제가 있다: (1) 순서 변경 한 번마다 플레이리스트 전체를 다시 쓰게 되어 곡 수가 많을수록 쓰기 비용이 커진다, (2) 두 사람이 동시에 서로 다른 곡을 옮기면 나중에 도착한 전체 배열 쓰기가 먼저 도착한 변경을 통째로 덮어써버려 "동시 편집 처리"(04문서, "마지막 조작이 우선 적용되고 다른 참여자 화면은 즉시 갱신되어 눈에 보이는 불일치가 없어야 한다")보다도 더 나쁜 결과(직전 변경이 완전히 사라짐)를 낼 수 있다.

**제안(권고, 구현 단계에서 재검토 가능)**: 각 `entry`에 정렬용 숫자 필드 `order`를 두고, RTDB 쿼리는 `orderByChild('order')`로 정렬해 읽는다. 곡 하나를 옮길 때는 "옮겨질 위치의 앞뒤 이웃 두 원소의 `order` 값 사이의 값"을 클라이언트가 계산해 **그 곡 하나의 `order` 필드만** 갱신한다(이른바 fractional indexing / 분수 순서 부여 — Trello 등 협업 리스트 서비스가 흔히 쓰는 패턴). 이러면:
- 순서 변경 한 번 = 쓰기 한 번(옮긴 곡의 `order` 필드만) — 목록 전체를 다시 쓰지 않는다.
- 두 사람이 동시에 서로 다른 곡을 옮겨도 서로 다른 노드를 건드리므로 충돌 표면이 크게 줄어든다(완전히 사라지지는 않는다 — 아래 "제약/리스크" 참고).
- 새 곡 추가는 `order = 현재 최댓값 + 상수`(맨 뒤에 추가)로 계산하면 된다.

이 설계를 채택하면 `sessionService.ts`의 `reorderPlaylist(sessionId, orderedEntryIds)` 시그니처 자체를 "전체 배열 전달"에서 "이동한 곡 하나 + 새 order 값"으로 바꾸는 것을 함께 권고한다 — 이는 스키마 설계와 맞물린 API 변경이라 구현 라운드 계획(요구사항 3)에 반영했다. 대안으로 "순서를 정수 인덱스로 두고 이동 시 영향받는 구간 전체를 다시 번호 매김"하는 방식도 가능하나, 곡 수가 많을수록 쓰기 비용이 커지고 위 충돌 문제도 그대로 남아 권장하지 않는다.

**`candidates` 표현**: `ParticipantMatch.candidates`(대체 후보 목록)는 검색 1회마다 통째로 교체되고 부분 삭제가 없는 짧은 리스트(제안: 상위 몇 개)다 — "부분 삭제로 인한 인덱스 구멍" 문제가 발생하지 않는 케이스이므로, 숫자 키(`"0"`, `"1"`, ...) 맵이든 JS 배열을 그대로 `set()`하든 안전하다. 다만 프로젝트 전체의 배열 회피 관례와 일관성을 위해 숫자 키 맵으로 통일할 것을 제안한다(강한 권고는 아님 — 구현 단계 판단에 맡긴다).

**서버 타임스탬프 — 반드시 `ServerValue.TIMESTAMP`를 써야 하는 필드 (중요)**

`05-sync-architecture.md`의 "모델 A: 서버를 기준 시계로 사용"은 "`playback.serverTimestamp`는 서버가 기록한 시각"이라는 전제 위에 서 있다. 그런데 현재 인메모리 코드(`sessionService.ts`, `SessionContext.tsx`)는 전부 `Date.now()`(**클라이언트 로컬 시계**)로 이 값을 채우고 있다 — 목업 단계에서는 문제가 없었지만, RTDB로 교체하면서 이 패턴을 그대로 옮기면 05문서의 핵심 전제가 깨진다(클라이언트 시계가 어긋난 기기, 또는 악의적으로 조작된 클라이언트가 거짓 시각을 써넣을 수 있음). **`/sessions/{sessionId}/playback/serverTimestamp`(그리고 같은 이유로 `meta/createdAt`, `participants/{id}/joinedAt`, `playlists/*/entries/{id}/addedAt`, `mixedPlaylist/{id}/addedAt`)는 클라이언트가 `Date.now()` 값을 직접 써넣는 대신 RTDB SDK가 제공하는 `ServerValue.TIMESTAMP`(쓰기 시점에 Firebase 서버가 실제 서버 시각으로 치환해주는 특수 placeholder 값)로 기록해야 한다.** 아래 "요구사항 2"의 규칙 예시에 이를 강제하는 `.validate` 규칙도 함께 제시한다.

### 왜 `/inviteCodes`를 별도 최상위 경로로 두는가 (역참조 인덱스 필요 여부)

**필요하다.** 현재 인메모리 구현의 `getSessionByInviteCode`는 코드에 이렇게 명시되어 있다: "`sessions/{sessionId}` 컬렉션을 inviteCode로 조회하려면 별도 인덱스... 지금은 in-memory Map 전체를 순회한다(세션 수가 적은 데모 스코프에서는 문제 없음)". RTDB에서 전체 `/sessions`를 순회하며 `inviteCode` 필드를 찾는 것은 (1) 세션 수가 늘어날수록 매번 전체 트리를 내려받는 것과 다름없어 비효율적이고, (2) 보안 규칙 관점에서도 치명적이다 — "코드로 참여하기"를 하려는 사용자(아직 그 세션의 참여자가 아님)가 `/sessions` **전체**를 읽을 수 있어야 한다는 뜻이 되어, 결과적으로 존재하는 모든 세션의 데이터를 누구나 열람할 수 있게 열어야 한다.

`/inviteCodes/{code} -> sessionId` 역참조 인덱스를 두면:
- 참여 시도자는 자신이 입력한 6자리 코드 하나만으로 `/inviteCodes/{그 코드}` 딱 한 경로만 읽으면 되고, 다른 세션의 정보는 전혀 노출되지 않는다.
- 이 경로에 `.read`를 걸어도 **`/inviteCodes` 루트 자체는 규칙을 별도로 열어주지 않는 한 목록 조회(전체 코드 열거)가 되지 않는다** — RTDB 규칙은 경로별로 평가되므로 `/inviteCodes/$code`에만 규칙을 걸면 "특정 코드 하나 읽기"만 허용되고 "코드 전체 나열"은 규칙이 없어 거부된다(아래 "요구사항 2"에서 이 패턴을 그대로 반영).

### 경로별 read/write 주체 요약표

| 경로 | 읽기 주체 | 쓰기 주체 | 비고 |
|---|---|---|---|
| `/inviteCodes/{code}` | 그 코드를 아는 누구나(참여 전 조회 필요) | 세션을 새로 만든 호스트만, 최초 1회(코드 재사용/덮어쓰기 금지) | 특정 코드 단건 읽기만 가능, 전체 나열 불가(규칙 설계로 자연히 막힘) |
| `/sessions/{id}/meta` | 그 세션의 참여자 전원 **+ 참여를 시도 중인 비참여자**(참여 여부를 판단하려면 정원·이름 등을 먼저 읽어야 함 — "닭과 달걀" 문제) | 생성 시 호스트만. 생성 이후에는 `capacity`는 불변(04문서 2026-07-25 확정, "생성 후 변경 불가")이라 사실상 재작성 대상이 없음 | 아래 "요구사항 2"에서 "읽기는 넓게, 쓰기는 좁게" 원칙으로 설계 |
| `/sessions/{id}/participants/{pid}` | 그 세션의 참여자 전원 | 본인 최초 참여 시 자신의 레코드 생성. `role` 필드는 방장만 변경 가능(및 관리자 본인의 자진 사임, 04문서 "관리자 임명 취소·사임" 절, 2026-07-25 확정) | 정원 초과 방지 규칙 필요(아래 "제약/리스크" 참고) |
| `/sessions/{id}/playlists/{svc}/entries/{eid}` | 참여자 전원 | 참여자 전원(현재 정책 — 04문서 "참여자 모두가 곡 추가/삭제/순서변경 가능") | `entryId`는 `push()` 또는 클라이언트 생성 고유 ID, 쓰기 시 자기 자신이 추가한 항목만 원할 경우 참여자 전원 허용이 더 단순하고 기존 정책과 부합 |
| `/sessions/{id}/playlists/{svc}/lastPlayback` | 참여자 전원 | `switchService` 실행 시점에 방장/관리자만(04문서 "권한 체계" — 서비스 전환은 방장·관리자 전용) | 일반사용자는 이 경로 직접 갱신 금지 |
| `/sessions/{id}/mixedPlaylist/{eid}`(공통 계층) | 참여자 전원 | 참여자 전원(곡 추가/삭제/순서변경, 04문서 "혼합 모드 플레이리스트 구조") | |
| `.../mixedPlaylist/{eid}/matches/{pid}` | 참여자 전원(다른 사람의 매칭 상태도 화면에 표시돼야 함) | **해당 `participantId` 본인만** | 09문서 "결정 2-3": 매칭 확인은 참여자별 독립 — 본인 매칭만 본인이 쓸 수 있어야 타인이 대신 확정/조작하는 것을 막을 수 있음 |
| `/sessions/{id}/playback` | 참여자 전원 | 참여자 전원 (현재 `SessionContext.tsx`의 `requestPlay/Pause/NextTrack/PrevTrack`가 role 제한 없이 전원에게 열려 있음 — 04문서의 권한 표는 "서비스 전환"만 제한하고 재생 조작 권한은 별도 규정 없음) | 재생 조작 권한을 방장/관리자로 제한할지는 04문서에도 없는 별개의 미확정 사안 — 이번 설계는 현재 구현 그대로("전원 가능")를 반영했을 뿐 새로 확정한 것은 아님 |

## 요구사항 2 — 보안 규칙 초안 (두 시나리오 비교, 결정 아님)

> 아래 두 시나리오는 서로 대체 관계다 — 하나를 선택해야 하며, **이 선택은 리더/사용자가 결정할 사항**이다(요청받은 대로 이 문서는 결정하지 않는다). 규칙 JSON은 핵심 패턴을 보여주는 예시이며, 모든 필드의 `.validate`를 완전히 채운 "그대로 배포 가능한" 완성본은 아니다 — 구현 단계에서 세부 타입 검증(문자열 길이, enum 값 검사 등)을 보강해야 한다.

### 시나리오 A — Firebase Auth 익명 인증(Anonymous Auth) 사용

**전제**: 앱 시작 시 `@react-native-firebase/auth`의 `signInAnonymously()`를 호출해 기기(또는 앱 세션)마다 고유한 `auth.uid`를 발급받는다. **중요한 설계 변경 요구사항**: 이 시나리오를 채택하면 `participantId`를 지금처럼 `utils/id.ts`의 `generateId('participant')`로 클라이언트가 임의 생성하는 대신, **`participantId === auth.uid`로 통일**해야 규칙에서 "본인 여부"(`auth.uid === $participantId`)를 검사할 수 있다. 이는 `sessionService.ts` 교체 시 참여자 ID 생성 방식 자체를 바꿔야 한다는 뜻이라 로드맵(요구사항 3)에 명시했다.

```json
{
  "rules": {
    "inviteCodes": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists() && newData.isString() && newData.val().length > 0",
        ".validate": "root.child('sessions').child(newData.val()).child('meta/hostParticipantId').val() === auth.uid"
      }
    },
    "sessions": {
      "$sessionId": {
        "meta": {
          ".read": "auth != null",
          ".write": "auth != null && (!data.exists() || data.child('hostParticipantId').val() === auth.uid)",
          "hostParticipantId": {
            ".validate": "newData.val() === auth.uid"
          },
          "createdAt": {
            ".validate": "newData.val() === now"
          },
          "capacity": {
            ".validate": "newData.isNumber() && newData.val() >= 2 && newData.val() <= 12 && (!data.exists())"
          }
        },
        "participants": {
          ".read": "auth != null",
          "$participantId": {
            ".write": "auth != null && auth.uid === $participantId",
            ".validate": "newData.hasChildren(['displayName', 'role', 'accountTier'])",
            ".write": "auth != null && auth.uid === $participantId && (!root.child('sessions').child($sessionId).child('participants').exists() || root.child('sessions').child($sessionId).child('participants').numChildren() < root.child('sessions').child($sessionId).child('meta/capacity').val() || data.exists())",
            "role": {
              ".write": "auth != null && (root.child('sessions').child($sessionId).child('meta/hostParticipantId').val() === auth.uid || (auth.uid === $participantId && data.val() === 'admin' && newData.val() === 'regular'))"
            },
            "joinedAt": {
              ".validate": "newData.val() === now"
            }
          }
        },
        "playlists": {
          ".read": "auth != null",
          "$service": {
            "entries": {
              "$entryId": {
                ".write": "auth != null && root.child('sessions').child($sessionId).child('participants').child(auth.uid).exists()",
                "addedAt": { ".validate": "newData.val() === now" }
              }
            },
            "lastPlayback": {
              ".write": "auth != null && root.child('sessions').child($sessionId).child('participants').child(auth.uid).child('role').val() !== 'regular'"
            }
          }
        },
        "mixedPlaylist": {
          ".read": "auth != null",
          "$entryId": {
            ".write": "auth != null && root.child('sessions').child($sessionId).child('participants').child(auth.uid).exists()",
            "matches": {
              "$participantId": {
                ".write": "auth != null && auth.uid === $participantId"
              }
            }
          }
        },
        "playback": {
          ".read": "auth != null",
          ".write": "auth != null && root.child('sessions').child($sessionId).child('participants').child(auth.uid).exists()",
          "serverTimestamp": {
            ".validate": "newData.val() === now"
          },
          "updatedByParticipantId": {
            ".validate": "newData.val() === auth.uid"
          }
        }
      }
    }
  }
}
```

**이 시나리오의 핵심 장점**: `auth.uid`가 Firebase 서버가 발급·서명한 값이라 **위조 불가능**하다. 이 덕분에 "이 세션의 진짜 참여자인가"(`participants/{auth.uid}` 존재 여부), "이 세션의 진짜 방장인가"(`meta/hostParticipantId === auth.uid`), "본인의 매칭 상태만 본인이 쓰는가"(`matches/{auth.uid}`) 같은 **의미 있는 신원 기반 검증**이 규칙 자체로 강제된다. `appointAdmin`/`revokeAdmin`처럼 "방장만 할 수 있어야 하는 조작"이 실제로 서버 측에서 막히는 것은 이 시나리오에서만 가능하다.

**단점**: (1) `@react-native-firebase/auth` 신규 설치·초기화가 필요하다(현재 미설치, `package.json` 확인 완료). (2) `participantId` 생성 방식을 `auth.uid` 기준으로 바꿔야 해 기존 `utils/id.ts` 관례와 `ParticipantInfo.participantId`를 쓰는 여러 화면 컴포넌트에 파급 영향이 있다(정확한 영향 범위 조사는 구현 단계 몫). (3) 어차피 익명 인증이라 "실명 인증"은 아니다 — 앱을 지웠다 새로 설치하면 새 `uid`가 발급되어 "같은 사람"이라는 연속성은 여전히 없다(이 프로젝트가 Spotify OAuth로 로그인하되 RTDB 인증 개념은 없다는 현재 상태와 비슷한 수준의 신원 보장 — 다만 "위조 불가능한 세션 내 고유 신원"은 확보된다는 점이 다르다).

### 시나리오 B — Firebase Auth 없이 세션 코드/ID를 비밀값처럼 취급

**전제**: RTDB 규칙은 `auth`에 의존하지 않고, "이 세션의 정확한 `sessionId`(또는 초대 코드)를 아는 사람만 그 경로에 접근할 수 있다"는 **경로 자체의 추측 불가능성(obscurity)** 에 의존한다.

```json
{
  "rules": {
    "inviteCodes": {
      "$code": {
        ".read": true,
        ".write": "!data.exists() && newData.isString() && newData.val().length > 0"
      }
    },
    "sessions": {
      "$sessionId": {
        "meta": {
          ".read": true,
          ".write": "!data.exists()",
          "createdAt": { ".validate": "newData.val() === now" },
          "capacity": { ".validate": "newData.isNumber() && newData.val() >= 2 && newData.val() <= 12 && !data.exists()" }
        },
        "participants": {
          ".read": true,
          "$participantId": {
            ".write": "data.exists() || root.child('sessions').child($sessionId).child('participants').numChildren() < root.child('sessions').child($sessionId).child('meta/capacity').val()",
            "joinedAt": { ".validate": "newData.val() === now" }
          }
        },
        "playlists": {
          ".read": true,
          "$service": {
            "entries": {
              "$entryId": {
                ".write": true,
                "addedAt": { ".validate": "newData.val() === now" }
              }
            },
            "lastPlayback": { ".write": true }
          }
        },
        "mixedPlaylist": {
          ".read": true,
          "$entryId": {
            ".write": true,
            "matches": {
              "$participantId": { ".write": true }
            }
          }
        },
        "playback": {
          ".read": true,
          ".write": true,
          "serverTimestamp": { ".validate": "newData.val() === now" }
        }
      }
    }
  }
}
```

**이 시나리오에서 근본적으로 불가능한 것 (중요)**: 규칙 언어에는 "요청을 보낸 게 실제로 누구인지" 검증할 수단이 `auth` 객체 말고는 없다. `auth`를 안 쓰기로 하면, "이 쓰기가 진짜 방장이 보낸 것인지"(`appointAdmin`), "이 매칭 확정이 진짜 본인이 한 것인지"(`setParticipantMatch`), "이 참여자 레코드가 자기 자신의 것인지" 같은 검사를 **원천적으로 서버 측에서 강제할 수 없다** — 클라이언트가 요청 바디에 담아 보내는 `participantId`/`role` 같은 필드는 전부 클라이언트 자기 신고(self-declared)이며 위조가 가능하다. 위 규칙 예시에서 `role` 쓰기나 `matches/{participantId}` 쓰기에 대해 "본인/방장만"이라는 제약을 아예 걸지 못하고 `true`(누구나)로 열어둔 이유가 이것이다 — **거는 게 불가능한 게 아니라, 걸어봤자 클라이언트가 보내는 값 자체를 믿을 수밖에 없어 의미가 없다.**

**보안 수준 비교(요약)**:

| 항목 | 시나리오 A (익명 인증) | 시나리오 B (무인증) |
|---|---|---|
| 세션 ID/초대 코드를 모르는 제3자의 무단 열람 | 방지됨(코드/ID 모르면 경로 자체를 모름 — 두 시나리오 동일) | 방지됨(동일) |
| 세션 ID/초대 코드를 아는(또는 추측/유출된) 제3자의 무단 열람 | 방지 안 됨(두 시나리오 모두 코드를 아는 사람은 읽을 수 있음 — auth 유무와 무관) | 방지 안 됨(동일) |
| 참여자가 아닌데 플레이리스트/재생상태를 조작 | 부분 방지(`participants/{auth.uid}` 존재 여부로 "이 세션에 참여한 적 있는 uid인지" 검사 가능) | **방지 불가**(세션 ID만 알면 참여 여부와 무관하게 전원이 열려 있는 경로가 많음) |
| 방장이 아닌 사람이 관리자 임명/해제 | **방지됨**(`hostParticipantId === auth.uid` 위조 불가) | **방지 불가**(방장 신원을 검증할 방법이 없어 사실상 누구나 자기 역할을 `admin`으로 자칭 가능) |
| 다른 참여자의 매칭 상태를 대신 확정/조작 | **방지됨**(`matches/{auth.uid}`만 본인이 쓰기 가능) | **방지 불가** |
| 초대 코드 무차별 대입(brute-force) 시도 | 방지 안 됨(익명 토큰 발급 자체가 사실상 무료·즉시라 실질적 장벽 거의 없음 — 두 시나리오 사실상 동일 취약점) | 방지 안 됨(동일) |
| 구현 복잡도 | 인증 SDK 설치·초기화, `participantId=auth.uid` 전환 필요 | 추가 설치 없음, 기존 `generateId()` 그대로 사용 가능 |
| 규칙 표현력 | 신원 기반 세밀한 제어 가능 | "세션 ID를 아는 사람 전원에게 동일 권한"으로만 표현 가능(전부 열거나 전부 닫는 수준) |

**요약(권고이되 결정 아님)**: "장거리 연인·친구 소규모 세션"(CLAUDE.md)이라는 이 앱의 실제 사용 맥락상, 초대 코드가 유출되지 않는 한 시나리오 B로도 당장 큰 사고는 나지 않을 가능성이 높다. 다만 04문서가 이미 확정한 3단계 권한 체계(방장만 관리자 임명 가능 등)를 "실제로 서버 측에서 강제"하려면 시나리오 A가 필요하다 — 시나리오 B를 선택하면 "권한 체계"는 클라이언트 UI 수준의 안내에 머물고 악의적 사용자(또는 리버스 엔지니어링된 클라이언트)가 얼마든지 우회할 수 있다는 점을 리더/사용자가 인지한 상태로 선택해야 한다. 익명 인증은 실명/전화번호 인증이 아니라 도입 비용이 크지 않다(SDK 설치 + 앱 시작 시 1회 호출)는 점도 참고 사항으로 덧붙인다.

## 요구사항 3 — `sessionService.ts` 교체 로드맵 (제안)

기존 코드 전체를 읽은 결과를 근거로, 아래처럼 4개 라운드로 나눌 것을 제안한다. 각 라운드는 "독립적으로 검증 가능한 단위"가 되도록 나눴다(괄호 안에 검증 근거).

**1라운드 — 세션 생성/조회/참여**
- 교체 대상: `createSession`, `getSession`, `getSessionByInviteCode`, `joinSessionByCode`
- 쓰기: `/sessions/{id}/meta`, `/sessions/{id}/participants/{hostId}`, `/inviteCodes/{code}` — 이 세 경로는 서로 다른 최상위/하위 위치에 걸쳐 있지만 RTDB의 **다중 경로 원자적 업데이트**(`update()`에 절대 경로 여러 개를 한 번에 넘기는 방식)로 한 번에 커밋해야 한다(아래 "제약/리스크" 참고 — 안 그러면 세션은 생겼는데 초대 코드 인덱스가 없어 영원히 못 찾는 세션이 생길 수 있다).
- 읽기: `subscribeToSession`이 `onValue('/sessions/{id}')`로 구독하도록 교체.
- **독립 검증 가능 근거**: 플레이리스트/재생상태 로직이 전혀 없어도 "기기 A에서 세션 생성 → RTDB 콘솔에 실제로 노드가 생김 → 기기 B에서 초대 코드로 참여 → 참여자 목록에 반영"까지 이 라운드 하나만으로 완결된 시나리오를 검증할 수 있다. 지금까지 "같은 프로세스에서 만든 세션만 참여 가능"했던 인메모리 구현의 근본적 한계(코드 주석에 이미 명시됨)가 이 라운드에서 처음으로 해소된다 — 검증 에이전트가 가장 먼저 확인해야 할 회귀 포인트이기도 하다.

**2-A라운드 — 단일 서비스 플레이리스트 CRUD**
- 교체 대상: `addTrack`, `removeTrack`, `reorderPlaylist` (Spotify 전용/YouTube 전용 세션)
- 정렬 키(`order`) 기반 이동 방식 도입(위 "요구사항 1" 참고) — 이 라운드에서 `reorderPlaylist`의 시그니처 변경(전체 배열 → 이동 대상 1건)이 함께 일어난다.
- **독립 검증 가능 근거**: 1라운드가 끝나면 세션·참여자는 이미 실제 RTDB에 있으므로, 이 라운드는 `PlaylistView.tsx` 화면 하나만으로 "두 기기에서 곡 추가/삭제/순서변경이 실시간으로 서로에게 반영되는지"를 독립적으로 검증할 수 있다. 재생 상태(3라운드)나 혼합 모드(2-B라운드)와 무관하게 동작해야 한다.

**2-B라운드 — 혼합 모드 플레이리스트 + 매칭**
- 교체 대상: `addMixedTrack`, `removeMixedTrack`, `reorderMixedPlaylist`, `setParticipantMatch`
- 2-A와 분리한 이유: (1) 데이터 모양이 근본적으로 다르다(04/09문서가 이미 "근본적으로 다른 구조"라고 명시) — 공통 식별자 계층 + 참여자별 매칭 이중 구조라 규칙도 별도로 설계해야 한다(위 "요구사항 2"의 `matches/{participantId}` 본인 전용 쓰기 규칙). (2) 혼합 모드는 세 세션 유형 중 하나일 뿐이라 회귀 범위가 좁다 — 2-A가 잘못됐다고 2-B까지 막힐 필요가 없고, 반대도 마찬가지다.
- **독립 검증 가능 근거**: 혼합 세션을 만들어 두 기기(한쪽 Spotify 참여, 한쪽 YouTube 참여)에서 곡 추가 → 각자 매칭 확인/수동 교체까지 이 라운드 하나로 완결 검증 가능.

**3라운드 — 재생상태 실시간 구독**
- 교체 대상: `switchService`(라운드 내 포함 권고 — 아래 이유), `SessionContext.tsx`의 `requestPlay`/`requestPause`/`requestNextTrack`/`requestPrevTrack`(현재 `sessionService.ts`에 대응 함수가 없고 로컬 상태만 바꾸고 있어, 이 라운드에서 처음으로 RTDB 쓰기 함수로 새로 만들어져야 함).
- 1·2라운드보다 뒤에 두는 이유: `playback.currentEntryId`가 가리키는 대상이 플레이리스트의 실제 엔트리이므로, 플레이리스트가 먼저 신뢰할 수 있는 RTDB 데이터여야 재생상태 전환(다음 곡 계산 등) 로직도 실데이터 기준으로 검증할 수 있다.
- **반드시 이 라운드에서 함께 확인할 것**: `serverTimestamp` 필드가 `Date.now()`가 아니라 `ServerValue.TIMESTAMP`로 기록되는지(위 "요구사항 1" 강조 내용) — 이걸 놓치면 05문서의 동기화 모델 전제가 조용히 깨진 채로 넘어갈 위험이 가장 큰 라운드다.
- **독립 검증 가능 근거**: 두 기기에서 같은 세션에 접속한 채 한쪽에서 재생/일시정지/다음곡을 조작하면 다른 쪽 화면(`NowPlayingView`/`YouTubeNowPlayingView`)이 실시간으로 따라오는지가 이 라운드의 검증 시나리오다. 드리프트 보정 알고리즘 자체(정확한 오차 임계값 등)는 05문서가 이미 "구현/검증 단계에 넘길 것"이라 명시한 별도 스파이크 대상이라 이 라운드 범위에 넣지 않는다.

**4라운드 — 참여자 목록(역할/연결 상태)**
- 교체 대상: `appointAdmin`, `revokeAdmin`, 참여자 `connectionStatus`/`delaySeconds` 갱신 로직(현재 코드에는 아직 명시적 갱신 함수가 없음 — 정적 필드로만 존재).
- 가장 마지막에 둔 이유: 이 라운드가 "요구사항 2"의 인증 방식 결정에 가장 민감하다 — 시나리오 A(익명 인증)라면 `role` 쓰기 규칙이 `hostParticipantId === auth.uid`로 실제 강제되지만, 시나리오 B라면 애초에 서버 측 강제가 불가능해 이 라운드의 "보안 규칙" 부분은 사실상 클라이언트 신뢰에 의존하는 것으로 범위가 축소된다. 인증 방식 결정이 늦어져도 1~3라운드는 막히지 않도록 순서를 맨 뒤로 배치했다.
- **독립 검증 가능 근거**: 방장이 참여자를 관리자로 임명/해제하는 흐름과(가능하다면) 연결 끊김 시뮬레이션(앱 강제 종료 후 다른 참여자 화면에 상태 반영 여부)을 이 라운드 하나로 검증 가능. `.info/connected` + `onDisconnect()` 조합(RTDB 공식 프레즌스 패턴)을 이 라운드에서 도입할 것을 제안한다(구현 단계 판단).

## 요구사항 4 — 제약/리스크

1. **트리 구조 오설계는 마이그레이션 비용이 크다.** RTDB는 "ALTER TABLE" 같은 개념이 없다 — 이미 쓰여진 데이터의 트리 모양을 바꾸려면 전체 트리를 읽어 변환한 뒤 다시 쓰는 별도 마이그레이션 스크립트(또는 Cloud Function)가 필요하다. 이번 설계에서 특히 되돌리기 비싼 두 가지 선택을 1라운드 착수 전에 미리 확정해둘 것을 권고한다: (a) `participantId`를 `auth.uid`로 통일할지 여부(시나리오 A/B 결정과 직결 — 나중에 바꾸면 기존 참여자 레코드 키를 전부 다시 써야 함), (b) 플레이리스트 정렬 키(`order`) 필드를 처음부터 넣을지(나중에 추가하면 기존 엔트리 전체에 소급 적용하는 마이그레이션이 필요).
2. **동시 쓰기 충돌 — 트랜잭션(`runTransaction`)이 실제로 필요한 지점은 생각보다 적다.** 04문서가 이미 플레이리스트 편집 충돌에 대해 "마지막 조작이 우선 적용되고 다른 참여자 화면은 즉시 갱신되어 눈에 보이는 불일치가 없어야 한다"를 최소 요구사항으로 명시했고, `entryId`가 매 쓰기마다 고유(추가는 새 키, 삭제는 그 키만 제거, 순서 변경은 위 fractional order로 자기 노드만 갱신)이므로 대부분의 플레이리스트 쓰기는 애초에 서로 다른 노드를 건드려 **트랜잭션 없이도 안전**하다. 다만 아래 두 지점은 다르다:
   - **세션 정원 초과 방지(참여 시점)**: "현재 참여자 수 < capacity일 때만 참여 허용"은 전형적인 "읽고-판단하고-쓰는" 패턴이라 경쟁 조건이 생길 수 있다. 클라이언트 측 `runTransaction`도 방법이지만, 악의적 클라이언트는 트랜잭션을 거치지 않고 바로 `set()`을 호출해 우회할 수 있으므로 **보안 규칙 자체에서 `newData.parent().numChildren() <= capacity` 형태로 강제하는 것을 권고**한다(위 시나리오 A/B 규칙 예시의 `participants/$participantId` `.write` 조건에 이미 이 패턴을 반영해뒀다) — RTDB는 같은 경로에 대한 동시 쓰기를 서버에서 순차 처리하므로 이 규칙은 클라이언트 트랜잭션 없이도 초과 참여를 막아준다.
   - **호스트 마이그레이션(새 방장 선출)**: 04문서 "권한 체계" 절이 아직 "누가 새 방장이 되는가"(선출 규칙)를 확정하지 않은 상태다 — 이 로직 자체가 설계되지 않았으므로 이번 문서에서 RTDB 규칙/트랜잭션 설계도 함께 유보한다. 다만 규칙이 나중에 확정되면, "방장이 없는 상태에서 여러 참여자가 동시에 자신을 새 방장으로 쓰려는" 경쟁이 생길 수 있어 그때는 `runTransaction`(또는 `.write` 규칙의 `!data.exists()` 형태로 최초 1건만 승인)이 필요할 가능성이 높다는 점만 미리 남겨둔다. **리더에게 제안**: `docs/decisions-needed.md`에 이미 04문서가 "확인 필요 1번"으로 남긴 "호스트 마이그레이션 선출 규칙"을 이번 RTDB 설계 라운드를 계기로 다시 상기시켜도 좋을 것 같다 — 4라운드(참여자 목록) 착수 전에 확정되지 않으면 그 라운드 범위가 좁아진다.
   - **정렬 키(fractional order) 충돌**: 두 참여자가 동시에 서로 다른 곡을 "같은 두 이웃 사이"로 옮기면 이론상 두 곡의 `order` 값이 거의 같아지는 경우가 드물게 생길 수 있다(트랜잭션으로 완전히 막기보다는, 발생 빈도가 매우 낮고 최악의 경우도 "두 곡의 순서가 살짝 꼬이는" 수준의 낮은 심각도라 트랜잭션 도입까지는 과하다고 판단 — 필요하면 주기적으로 `order` 값을 재정렬하는 백그라운드 정리 로직을 P2로 검토할 것을 제안한다).
3. **다중 경로 원자적 쓰기 누락 위험**: `createSession`이 `/sessions/{id}/meta` + `/sessions/{id}/participants/{hostId}` + `/inviteCodes/{code}` 세 곳에 각각 별도의 `set()`을 순서대로 호출하면, 중간에 앱이 죽거나 네트워크가 끊기는 경우 "세션은 있는데 초대 코드 인덱스가 없어 아무도 못 찾는" 고아 세션이 만들어질 수 있다 — 반드시 RTDB의 다중 경로 `update()`(절대 경로 여러 개를 한 객체에 담아 한 번에 호출) 하나로 세 곳을 동시에 커밋하도록 구현해야 한다는 점을 구현 라운드에 명시적으로 전달할 것을 제안한다.
4. **읽기 규칙의 "상위 노드에서 허용되면 하위 전부 허용" 계단식(cascading) 특성 주의**: RTDB 규칙은 읽기 요청 시 루트부터 대상 경로까지 내려가며 `.read`를 평가하고, **상위 어느 지점에서든 한 번 `true`가 나오면 그 하위 전체 읽기가 허용**된다(하위에서 다시 좁힐 수 없음). 이번 설계는 `/sessions/{id}/meta`, `/participants`, `/playlists`, `/mixedPlaylist`, `/playback` 각각에 개별적으로 `.read`를 걸어뒀지만(세션 최상위 노드 자체에는 걸지 않음), 만약 나중에 "이 세션 하위 전체를 읽어도 된다"는 규칙을 세션 루트(`/sessions/{id}`)에 한 번 걸어버리면 이후 "특정 필드만 더 좁게 막고 싶다"는 요구가 생겨도 그 필드를 별도 최상위 경로로 다시 빼내는 마이그레이션 없이는 불가능해진다 — 향후 민감한 필드(예: 결제 정보 등, 현재는 없음)가 추가될 가능성을 고려해 세션 루트에는 넓은 `.read: true`를 걸지 않고 지금처럼 하위 경로별로 개별 규칙을 유지할 것을 권고한다.
5. **보안 규칙이 곧 유일한 서버측 검증 계층이라는 점 재강조**: Cloud Functions가 없는 현재 아키텍처에서는, `sessionService.ts`에 JS로 짜여진 로직(정원 검사, `platform_required` 반환 등)이 "친절한 클라이언트"에게만 유효하다. 시나리오 A(익명 인증)를 채택하더라도, 이번 문서의 규칙 예시에 없는 세부 검증(예: `track.durationMs`가 음수가 아닌지, `title` 길이 제한 등)은 구현 단계에서 규칙에 계속 보강해나가야 한다는 점을 명시해둔다 — 이번 문서는 "핵심 신원/권한 검증 패턴"까지만 다뤘다.

## 제안 (요약)

1. **트리 스키마**는 위 "요구사항 1"의 구조(세션 하위에 `meta`/`participants`/`playlists`/`mixedPlaylist`/`playback`, 최상위에 별도 `/inviteCodes` 역참조 인덱스)로 시작할 것을 제안한다. 특히 `/inviteCodes` 역참조 인덱스는 선택 사항이 아니라 **필수**로 판단한다(위 근거) — 이 부분은 대안이 없다고 봐도 무방하다.
2. **정렬 키는 fractional order 방식**을 권고하되, 구현 단계에서 실제 드래그 앤 드롭 UX 구현 난이도가 예상보다 크면 "정수 인덱스 + 이동 시 구간 재번호" 방식으로 후퇴하는 것도 가능하다 — 이건 이번 라운드의 "결정 불가 항목"이 아니라 구현 편의에 따라 조정 가능한 설계 디테일로 남겨둔다.
3. **인증 방식(시나리오 A vs B)은 결정이 필요하다** — 이 문서는 결정하지 않는다. 요약하면 A는 "04문서가 이미 확정한 권한 체계를 실제로 서버에서 강제할 수 있음, 대신 인증 SDK 도입 + `participantId` 설계 변경 비용", B는 "추가 비용 없음, 대신 권한 체계가 클라이언트 신뢰 수준에 머묾"이다. 리더가 이 문서를 근거로 사용자에게 선택지를 전달하고, 결정 이후 `docs/decisions-needed.md`에도 반영할 것을 제안한다.
4. **로드맵은 1(세션) → 2-A(단일 플레이리스트) → 2-B(혼합 플레이리스트) → 3(재생상태) → 4(참여자/역할)** 순서를 제안한다. 2-A/2-B는 서로 독립적이라 순서를 바꿔도 무방하지만, 3라운드는 1·2 완료를 전제하고 4라운드는 인증 방식 결정에 가장 민감해 뒤에 배치했다.

## 참고자료

- `docs/decision-log.md` — RTDB 단일 구성 확정 회의록
- `docs/spikes/firebase-rtdb-vs-firestore.md` — RTDB 활성화·기본 잠금 규칙 실측(401 응답 확인)
- `docs/specs/05-sync-architecture.md` — 서버 기준 시계 모델(이번 문서의 `serverTimestamp` 요구사항의 근거)
- `docs/specs/04-playlist.md` — 플레이리스트 구조·권한 체계·세션 정원·Free 계정 정책
- `docs/specs/09-cross-platform-mixed-mode.md` — 혼합 모드 이중 계층 데이터 모델
- `apps/mobile/src/types/domain.ts`, `apps/mobile/src/services/session/sessionService.ts`, `apps/mobile/src/state/SessionContext.tsx`, `apps/mobile/src/services/firebase/firebaseClient.ts` — 현재 클라이언트 코드
- Firebase 공식 문서: RTDB 보안 규칙(구조, `.read`/`.write`/`.validate`, cascading 동작), `ServerValue.TIMESTAMP`, 다중 경로 원자적 업데이트, 배열 대신 객체를 쓸 것을 권고하는 공식 안내, 프레즌스(`.info/connected` + `onDisconnect()`) 패턴 — 이번 문서의 규칙 예시·권고는 이 공식 문서들의 잘 알려진 관용 패턴을 이 프로젝트 스키마에 적용한 것이다.
