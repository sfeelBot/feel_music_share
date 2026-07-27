import {useRef} from 'react';
import {Animated} from 'react-native';
import {State} from 'react-native-gesture-handler';
import type {PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent} from 'react-native-gesture-handler';

/**
 * "아래로 드래그해서 닫기" 제스처 (PB-03, docs/design/06-ui-polish-audit.md).
 * `ParticipantsBottomSheet`/`MatchingQueueSheet` 둘 다 같은 동작이 필요해 공통 훅으로 뺐다.
 *
 * 파트 A(스와이프 삭제)의 `Swipeable`과 같은 이유로 reanimated 없이 gesture-handler의
 * `PanGestureHandler` + RN 코어 `Animated`만으로 구현한다(이 목적에 reanimated 도입은 과한 신규
 * 의존성 — 06번 문서 A.2 판단과 동일 근거).
 *
 * 사용하는 쪽은 반환된 `onGestureEvent`/`onHandlerStateChange`를 시트 상단(그래버/헤더 등 — 리스트
 * 스크롤 영역과 겹치지 않는 좁은 영역)의 `PanGestureHandler`에 연결하고, `translateY`를 시트 전체
 * 컨테이너의 `transform`에 연결한다. 리스트(FlatList 등) 전체를 드래그 가능 영역으로 만들면 세로
 * 스크롤과 드래그-닫기 제스처가 충돌하므로 의도적으로 헤더 영역에만 건다.
 */
const CLOSE_DISTANCE_THRESHOLD = 80;
const CLOSE_VELOCITY_THRESHOLD = 800;

export function useDragToDismiss(onDismiss: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;
  // Animated.event 자체는 translateY(ref로 고정된 Animated.Value)만 참조하므로 매 렌더 재생성해도
  // 무해하다 — gesture-handler 공식 예제와 동일한 관용구.
  const onGestureEvent = Animated.event<PanGestureHandlerGestureEvent>(
    [{nativeEvent: {translationY: translateY}}],
    {useNativeDriver: true},
  );

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState !== State.ACTIVE) {
      return;
    }
    const {translationY, velocityY} = event.nativeEvent;
    if (translationY > CLOSE_DISTANCE_THRESHOLD || velocityY > CLOSE_VELOCITY_THRESHOLD) {
      onDismiss();
    }
    // 닫기 임계치를 못 넘겼거나(취소) 실제로 닫힌 경우나, 시각적으로는 항상 원위치로 되돌린다 —
    // 닫히는 경우엔 onDismiss가 visible=false로 만들어 Modal 자체가 사라지므로 스프링 애니메이션이
    // 실제로 보일 일은 없지만, 다음에 다시 열렸을 때 0 위치에서 시작하도록 항상 리셋해둔다.
    Animated.spring(translateY, {toValue: 0, useNativeDriver: true, bounciness: 0}).start();
  };

  // 위로는 드래그해도 움직이지 않게(닫기는 아래 방향만) 클램프한다.
  const clampedTranslateY = translateY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: 'clamp',
  });

  return {translateY: clampedTranslateY, onGestureEvent, onHandlerStateChange};
}
