import 'package:flutter_test/flutter_test.dart';
import 'package:bluelight_sms_sync/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BlueLightSyncApp());
    expect(find.text('BlueLight Sync'), findsOneWidget);
  });
}
