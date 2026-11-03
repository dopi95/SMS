import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BlueLightSyncApp());
}

class BlueLightSyncApp extends StatelessWidget {
  const BlueLightSyncApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BlueLight SMS Sync',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E3A8A), // BlueLight Navy
          primary: const Color(0xFF1E3A8A),
          secondary: const Color(0xFF059669), // Emerald
          brightness: Brightness.light,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3B82F6),
          primary: const Color(0xFF3B82F6),
          secondary: const Color(0xFF10B981),
          brightness: Brightness.dark,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade800),
          ),
        ),
      ),
      themeMode: ThemeMode.system,
      home: const SyncDashboardScreen(),
    );
  }
}

class SyncDashboardScreen extends StatefulWidget {
  const SyncDashboardScreen({super.key});

  @override
  State<SyncDashboardScreen> createState() => _SyncDashboardScreenState();
}

class _SyncDashboardScreenState extends State<SyncDashboardScreen> with WidgetsBindingObserver {
  static const platform = MethodChannel('com.bluelight.sms_sync/channel');

  int totalRecords = 0;
  int syncedCount = 0;
  int pendingCount = 0;
  int failedCount = 0;
  bool hasPermission = false;
  List<Map<String, dynamic>> records = [];
  Timer? refreshTimer;
  bool loading = true;
  bool isScanning = false;
  bool isTesting = false;
  bool isSyncing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    checkPermissions();
    fetchData();

    // Auto-refresh stats and records every 3 seconds
    refreshTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      fetchData(silent: true);
    });
  }

  @override
  void dispose() {
    refreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      checkPermissions();
      fetchData();
      if (pendingCount > 0) {
        triggerAutoSync();
      }
    }
  }

  Future<void> checkPermissions() async {
    try {
      final bool granted = await platform.invokeMethod('hasPermissions');
      setState(() => hasPermission = granted);
      if (!granted) {
        await platform.invokeMethod('requestPermissions');
      } else {
        scanInbox(silent: true);
      }
    } catch (e) {
      debugPrint('Permission check error: $e');
    }
  }

  Future<void> triggerSyncManual() async {
    if (isSyncing) return;
    setState(() => isSyncing = true);
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final result = await platform.invokeMethod('triggerSync');
      final synced = (result is Map) ? (result['synced'] ?? 0) : 0;
      final remaining = (result is Map) ? (result['remaining'] ?? 0) : 0;
      final error = (result is Map) ? (result['error'] ?? '') : '';

      if (mounted) {
        if (error.toString().isNotEmpty) {
          scaffold.showSnackBar(
            SnackBar(
              content: Text('Sync report: $error'),
              backgroundColor: Colors.red.shade700,
              duration: const Duration(seconds: 6),
            ),
          );
        } else if (synced > 0) {
          scaffold.showSnackBar(
            SnackBar(
              content: Text('✓ Synced $synced payment(s) to website! ($remaining remaining)'),
              backgroundColor: const Color(0xFF059669),
            ),
          );
        } else {
          scaffold.showSnackBar(
            const SnackBar(content: Text('No pending messages were synced.')),
          );
        }
      }
      fetchData(silent: true);
    } catch (e) {
      if (mounted) {
        scaffold.showSnackBar(
          SnackBar(content: Text('Sync failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isSyncing = false);
    }
  }

  void triggerAutoSync() async {
    if (isSyncing) return;
    isSyncing = true;
    try {
      await platform.invokeMethod('triggerSync');
      fetchData(silent: true);
    } catch (e) {
      debugPrint('Auto-sync error: $e');
    } finally {
      isSyncing = false;
    }
  }

  Future<void> scanInbox({bool silent = false}) async {
    if (isScanning) return;
    setState(() => isScanning = true);
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final result = await platform.invokeMethod('scanInbox');
      if (!silent && mounted) {
        final bankCount = (result is Map) ? (result['bank'] ?? 0) : 0;
        final otherCount = (result is Map) ? (result['other'] ?? 0) : 0;
        scaffold.showSnackBar(
          SnackBar(
            content: Text('Inbox scanned: found $bankCount bank SMS, $otherCount other messages.'),
            backgroundColor: bankCount > 0 ? const Color(0xFF059669) : Colors.blueGrey,
          ),
        );
      }
      fetchData(silent: true);
    } catch (e) {
      if (!silent && mounted) {
        scaffold.showSnackBar(
          SnackBar(content: Text('Scan failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isScanning = false);
    }
  }

  Future<void> sendTestSms() async {
    if (isTesting) return;
    setState(() => isTesting = true);
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final result = await platform.invokeMethod('sendTestSms');
      final synced = (result is Map) ? (result['synced'] ?? 0) : 0;
      final error = (result is Map) ? (result['error'] ?? '') : '';

      if (mounted) {
        if (synced > 0) {
          scaffold.showSnackBar(
            const SnackBar(
              content: Text('✓ Test CBE SMS created and synced to server successfully!'),
              backgroundColor: Color(0xFF059669),
            ),
          );
        } else {
          scaffold.showSnackBar(
            SnackBar(
              content: Text(error.toString().isNotEmpty ? 'Sync status: $error' : 'Test SMS saved in queue.'),
              backgroundColor: Colors.amber.shade900,
            ),
          );
        }
      }
      fetchData(silent: true);
    } catch (e) {
      if (mounted) {
        scaffold.showSnackBar(
          SnackBar(content: Text('Test error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => isTesting = false);
    }
  }

  Future<void> retryRecordSync(int id) async {
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final result = await platform.invokeMethod('retrySync', {'id': id});
      final error = (result is Map) ? (result['error'] ?? '') : '';
      final synced = (result is Map) ? (result['synced'] ?? 0) : 0;

      if (mounted) {
        if (error.toString().isNotEmpty) {
          scaffold.showSnackBar(
            SnackBar(content: Text('Failed: $error'), backgroundColor: Colors.red),
          );
        } else if (synced > 0) {
          scaffold.showSnackBar(
            const SnackBar(content: Text('✓ Successfully synced to web!'), backgroundColor: Color(0xFF059669)),
          );
        } else {
          scaffold.showSnackBar(const SnackBar(content: Text('Sync requested.')));
        }
      }
      fetchData(silent: true);
    } catch (e) {
      if (mounted) {
        scaffold.showSnackBar(
          SnackBar(content: Text('Retry error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> fetchData({bool silent = false}) async {
    if (!silent) setState(() => loading = true);
    try {
      final statsResult = await platform.invokeMethod('getStats');
      if (statsResult is Map) {
        final newTotal = (statsResult['total'] as num?)?.toInt() ?? 0;
        final newSynced = (statsResult['synced'] as num?)?.toInt() ?? 0;
        final newPending = (statsResult['pending'] as num?)?.toInt() ?? 0;
        final newFailed = (statsResult['failed'] as num?)?.toInt() ?? 0;

        setState(() {
          totalRecords = newTotal;
          syncedCount = newSynced;
          pendingCount = newPending;
          failedCount = newFailed;
        });

        // Automatically trigger sync if there are pending items
        if (newPending > 0 && !isSyncing) {
          triggerAutoSync();
        }
      }

      final recordsResult = await platform.invokeMethod('getRecords');
      if (recordsResult is List) {
        setState(() {
          records = recordsResult
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching data: $e');
    } finally {
      if (!silent) setState(() => loading = false);
    }
  }

  void openSettingsModal() async {
    try {
      final config = await platform.invokeMethod('getConfig');
      if (!mounted) return;

      final urlController = TextEditingController(text: config['url'] ?? '');
      final secretController = TextEditingController(text: config['secret'] ?? '');

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (ctx) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Server Configuration',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your app automatically sends bank SMS to this server. Pre-configured for BlueLight Academy.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: urlController,
                  decoration: const InputDecoration(
                    labelText: 'Webhook URL',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.link),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: secretController,
                  decoration: const InputDecoration(
                    labelText: 'Secret Key',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.key),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () async {
                      final nav = Navigator.of(ctx);
                      final scaffold = ScaffoldMessenger.of(context);
                      await platform.invokeMethod('saveConfig', {
                        'url': urlController.text.trim(),
                        'secret': secretController.text.trim(),
                      });
                      if (mounted) {
                        nav.pop();
                        scaffold.showSnackBar(
                          const SnackBar(content: Text('Settings saved successfully!')),
                        );
                      }
                      fetchData(silent: true);
                    },
                    child: const Text('Save Settings', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
        },
      );
    } catch (e) {
      debugPrint('Settings error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.sync_alt_rounded, color: theme.colorScheme.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'BlueLight Sync',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  'Automatic Bank Forwarder',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: isScanning
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.move_to_inbox_rounded),
            tooltip: 'Scan Phone Inbox',
            onPressed: isScanning ? null : () => scanInbox(),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Server Settings',
            onPressed: openSettingsModal,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => fetchData(),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Permission Alert Banner if not granted
            if (!hasPermission)
              Card(
                color: Colors.amber.shade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: Colors.amber.shade300),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 30),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'SMS Permission Needed',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                            ),
                            const Text(
                              'Tap to allow SMS reading so bank payments sync automatically.',
                              style: TextStyle(fontSize: 11, color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.amber.shade700,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        onPressed: checkPermissions,
                        child: const Text('Grant'),
                      ),
                    ],
                  ),
                ),
              ),

            // Main Status Banner (Pulse / Active)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF1E3A8A),
                    Color(0xFF2563EB),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981), // Emerald pulse
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'AUTO-SYNC ACTIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0xFF34D399),
                            width: 1,
                          ),
                        ),
                        child: const Text(
                          '● Active',
                          style: TextStyle(
                            color: Color(0xFF34D399),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Listening 24/7 for CBE & Bank SMS',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Incoming payments automatically upload to your portal. Works offline with auto-recovery on reconnection.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // Quick Actions: Scan Inbox & Send Test
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: isScanning ? null : () => scanInbox(),
                    icon: isScanning
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.move_to_inbox_rounded, size: 18),
                    label: const Text('Scan Inbox SMS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: isTesting ? null : sendTestSms,
                    icon: isTesting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send_rounded, size: 18),
                    label: const Text('Send Test SMS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Statistics Row (Cards)
            Row(
              children: [
                Expanded(
                  child: Card(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Synced to Web',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                              const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '$syncedCount',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF10B981),
                            ),
                          ),
                          const Text(
                            'Recorded payments',
                            style: TextStyle(fontSize: 10, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: pendingCount > 0 ? triggerSyncManual : null,
                    child: Card(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Offline Queue',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                                isSyncing
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : Icon(
                                        Icons.sync,
                                        color: pendingCount > 0 ? Colors.amber.shade700 : Colors.grey,
                                        size: 18,
                                      ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '$pendingCount',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: pendingCount > 0 ? Colors.amber.shade700 : Colors.grey,
                              ),
                            ),
                            Text(
                              pendingCount > 0
                                  ? (isSyncing ? 'Syncing now...' : 'Tap to sync now')
                                  : 'All up to date',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: pendingCount > 0 ? FontWeight.bold : FontWeight.normal,
                                color: pendingCount > 0 ? Colors.amber.shade800 : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // Live Activity Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Phone SMS Activity',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Total Captured: $totalRecords',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Records List
            if (records.isEmpty)
              Card(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                  child: Column(
                    children: [
                      Icon(Icons.sms_outlined, size: 42, color: Colors.grey.shade400),
                      const SizedBox(height: 10),
                      const Text(
                        'Waiting for SMS',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'When an SMS arrives, it will appear here. Bank payments automatically sync to your website. You can also tap "Scan Inbox SMS" above to import past messages.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...records.map((rec) {
                final status = rec['status'] ?? 'PENDING';
                final isSynced = status == 'SYNCED';
                final isPending = status == 'PENDING';
                final isNonBank = status == 'NON_BANK';
                final message = rec['message'] ?? '';
                final sender = rec['sender'] ?? 'Unknown';
                final error = rec['error'] ?? '';
                final id = rec['id'] as int? ?? 0;
                final timestamp = rec['receivedAt'] as int? ?? 0;
                final dateStr = DateTime.fromMillisecondsSinceEpoch(timestamp)
                    .toLocal()
                    .toString()
                    .split('.')[0];

                Color statusBgColor;
                Color statusTextColor;
                String statusLabel;

                if (isSynced) {
                  statusBgColor = Colors.green.withValues(alpha: 0.12);
                  statusTextColor = Colors.green.shade700;
                  statusLabel = '✓ Synced';
                } else if (isPending) {
                  statusBgColor = Colors.amber.withValues(alpha: 0.12);
                  statusTextColor = Colors.amber.shade800;
                  statusLabel = '⏳ Pending';
                } else if (isNonBank) {
                  statusBgColor = Colors.blueGrey.withValues(alpha: 0.12);
                  statusTextColor = Colors.blueGrey.shade700;
                  statusLabel = 'ℹ Non-Bank';
                } else {
                  statusBgColor = Colors.red.withValues(alpha: 0.12);
                  statusTextColor = Colors.red.shade700;
                  statusLabel = '✕ Failed';
                }

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primary.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    sender,
                                    style: TextStyle(
                                      color: theme.colorScheme.primary,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  dateStr,
                                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusBgColor,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    statusLabel,
                                    style: TextStyle(
                                      color: statusTextColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                if (!isSynced && id > 0) ...[
                                  const SizedBox(width: 4),
                                  IconButton(
                                    icon: const Icon(Icons.sync, size: 16),
                                    tooltip: 'Sync this message now',
                                    onPressed: () => retryRecordSync(id),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          message,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                          ),
                        ),
                        if (error.toString().isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Reason: $error',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.red.shade600,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
