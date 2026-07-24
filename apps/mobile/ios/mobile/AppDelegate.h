#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
#import "RNAppAuthAuthorizationFlowManager.h"

// react-native-app-auth(Spotify OAuth, spotifyAuth.ts)가 feelmusicshare:// 콜백으로 앱이
// 재진입했을 때 대기 중인 인증 세션을 재개하려면 RNAppAuthAuthorizationFlowManager 프로토콜을
// 채택해야 한다 (공식 문서 "Manual Setup > iOS Setup > Define openURL callback in AppDelegate",
// react-native >= 0.68 / Objective-C AppDelegate 기준). Info.plist의 CFBundleURLTypes 등록만으로는
// URL이 앱까지는 전달되지만 AppAuth 세션까지는 연결되지 않아 authorize() 프로미스가 끝나지 않는다.
@interface AppDelegate : RCTAppDelegate <RNAppAuthAuthorizationFlowManager>

@property(nonatomic, weak) id<RNAppAuthAuthorizationFlowManagerDelegate> authorizationFlowManagerDelegate;

@end
