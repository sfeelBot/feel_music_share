import React, {useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {PrimaryButton} from '../components/Buttons';
import {useTheme} from '../theme/ThemeContext';
import {brand} from '../theme/tokens';

/**
 * 온보딩 3컷 (US-601, 00-ux-flow.md 2.2절).
 * 1컷: 핵심 가치 / 2컷: 협업 플레이리스트 / 3컷: 투명성 카드(US-406, 03-screen-mockups.html 갤러리 1번과 동일 구성).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const CUTS = [
  {
    title: '같은 곡을, 같은 순간에',
    body: '멀리 있어도 함께 듣는 방을 만들어보세요.',
  },
  {
    title: '누구나 곡을 추가해요',
    body: '함께 만드는 플레이리스트 — 누가 골랐는지 항상 표시돼요.',
  },
];

export default function OnboardingScreen({navigation}: Props) {
  const theme = useTheme();
  const {width} = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (next: number) => {
    setIndex(next);
    scrollRef.current?.scrollTo({x: next * width, animated: true});
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(next);
  };

  const goToSpotifyConnect = () => navigation.navigate('SpotifyConnect');

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}>
        {CUTS.map(cut => (
          <View key={cut.title} style={[styles.page, {width}]}>
            <View style={styles.illustrationPlaceholder} />
            <Text style={[styles.title, {color: theme.text}]}>{cut.title}</Text>
            <Text style={[styles.body, {color: theme.textSecondary}]}>{cut.body}</Text>
          </View>
        ))}

        {/* 3컷: 투명성 카드 (US-406) */}
        <View style={[styles.page, {width}]}>
          <View style={styles.syncIllustration}>
            <View style={[styles.phoneDot, {borderColor: theme.border}]}>
              <View style={[styles.speakerDot, {backgroundColor: brand.primary}]} />
            </View>
            <Text style={[styles.linkIcon, {color: theme.textSecondary}]}>⇄</Text>
            <View style={[styles.phoneDot, {borderColor: theme.border}]}>
              <View style={[styles.speakerDot, {backgroundColor: brand.primary}]} />
            </View>
          </View>
          <Text style={[styles.title, {color: theme.text}]}>
            재생은 각자의 Spotify 앱에서 이뤄져요.{'\n'}feel_music_share는 그걸 맞춰주는 역할이에요.
          </Text>
          <Text style={[styles.body, {color: theme.textSecondary}]}>
            우리 서버가 음악을 직접 스트리밍하지 않아요. 각자 기기의 Spotify가 로컬로 재생하고, 저희는 그
            타이밍만 맞춰드려요.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {CUTS.concat([{title: '', body: ''}]).map((cut, i) => (
            <View
              key={`dot-${cut.title || 'transparency'}-${i}`}
              style={[
                styles.dot,
                {backgroundColor: i === index ? brand.primary : theme.border},
              ]}
            />
          ))}
        </View>
        {index < CUTS.length ? (
          <TouchableOpacity
            style={[styles.nextButton, {backgroundColor: theme.bgElevated, borderColor: theme.border}]}
            onPress={() => goTo(index + 1)}
            accessibilityRole="button">
            <Text style={[styles.nextButtonText, {color: theme.text}]}>다음</Text>
          </TouchableOpacity>
        ) : (
          <PrimaryButton label="Spotify로 시작하기" onPress={goToSpotifyConnect} style={styles.ctaButton} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  page: {flex: 1, justifyContent: 'center', paddingHorizontal: 28},
  illustrationPlaceholder: {height: 120, marginBottom: 24},
  title: {fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 32},
  body: {fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 21},
  syncIllustration: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 16},
  phoneDot: {width: 56, height: 56, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  speakerDot: {width: 14, height: 14, borderRadius: 7},
  linkIcon: {fontSize: 24},
  footer: {paddingHorizontal: 28, paddingBottom: 16},
  dots: {flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20},
  dot: {width: 8, height: 8, borderRadius: 4},
  nextButton: {borderWidth: 1.5, borderRadius: 999, paddingVertical: 14, alignItems: 'center'},
  nextButtonText: {fontSize: 16, fontWeight: '700'},
  ctaButton: {},
});
