import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';
import '../../core/network/api_client.dart';
import '../../data/models/user_model.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  final UserModel user;
  final VoidCallback onToggleTheme;
  final bool isDarkMode;

  const DashboardScreen({
    Key? key,
    required this.user,
    required this.onToggleTheme,
    required this.isDarkMode,
  }) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  List<Map<String, dynamic>> _trainers = [];
  bool _isLoadingTrainers = false;
  String? _trainersError;

  @override
  void initState() {
    super.initState();
    if (widget.user.isAdmin) {
      _fetchTrainers();
    }
  }

  Future<void> _fetchTrainers() async {
    setState(() {
      _isLoadingTrainers = true;
      _trainersError = null;
    });

    try {
      final list = await ApiClient().getTrainers();
      setState(() {
        _trainers = list;
        _isLoadingTrainers = false;
      });
    } catch (e) {
      setState(() {
        _trainersError = e.toString().replaceAll('Exception: ', '');
        _isLoadingTrainers = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Oturumu Kapat'),
        content: const Text('FitTrack PT oturumunuzu kapatmak istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Çıkış Yap'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await ApiClient().logout();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => LoginScreen(
            onToggleTheme: widget.onToggleTheme,
            isDarkMode: widget.isDarkMode,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDarkMode;
    final user = widget.user;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primaryOrange.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.fitness_center, color: AppColors.primaryOrange, size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('FitTrack PT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(
                  user.salonName ?? 'Merkez Şube',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Rol Rozeti (Badge)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: _getRoleBadgeColor(user.role).withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: BorderSide(color: _getRoleBadgeColor(user.role), width: 1),
            ),
            child: Text(
              _getRoleTitle(user.role),
              style: TextStyle(
                color: _getRoleBadgeColor(user.role),
                fontWeight: FontWeight.bold,
                fontSize: 11,
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Tema Değiştirici
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
              size: 20,
            ),
            tooltip: isDark ? 'Açık Tema' : 'Koyu Tema',
            onPressed: widget.onToggleTheme,
          ),

          // Çıkış Yap Butonu
          IconButton(
            icon: const Icon(Icons.logout, size: 20, color: AppColors.error),
            tooltip: 'Çıkış Yap',
            onPressed: _handleLogout,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Row(
        children: [
          // Masaüstü ve Geniş Ekranlar İçin Sol Navigasyon Rayı
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            labelType: NavigationRailLabelType.all,
            backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
            selectedIconTheme: const IconThemeData(color: AppColors.primaryOrange),
            unselectedIconTheme: IconThemeData(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
            selectedLabelTextStyle: const TextStyle(
              color: AppColors.primaryOrange,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
            unselectedLabelTextStyle: TextStyle(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              fontSize: 11,
            ),
            destinations: _buildNavDestinations(user.role),
          ),
          const VerticalDivider(thickness: 1, width: 1),

          // Sağ Ana İçerik Alanı
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(24.0),
              child: _buildRoleContent(user, isDark),
            ),
          ),
        ],
      ),
    );
  }

  Color _getRoleBadgeColor(String role) {
    switch (role) {
      case 'admin':
        return AppColors.primaryOrange;
      case 'trainer':
        return const Color(0xFF3B82F6); // Mavi
      case 'member':
        return AppColors.success;
      default:
        return AppColors.darkTextSecondary;
    }
  }

  String _getRoleTitle(String role) {
    switch (role) {
      case 'admin':
        return 'YÖNETİCİ (ADMIN)';
      case 'trainer':
        return 'PERSONAL TRAINER';
      case 'member':
        return 'SPORCU ÜYE';
      default:
        return role.toUpperCase();
    }
  }

  List<NavigationRailDestination> _buildNavDestinations(String role) {
    if (role == 'admin') {
      return const [
        NavigationRailDestination(
          icon: Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard),
          label: Text('Özet Panel'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.sports_outlined),
          selectedIcon: Icon(Icons.sports),
          label: Text('PT Yönetimi'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long),
          label: Text('Seanslar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.security_outlined),
          selectedIcon: Icon(Icons.security),
          label: Text('Audit Log'),
        ),
      ];
    } else if (role == 'trainer') {
      return const [
        NavigationRailDestination(
          icon: Icon(Icons.calendar_month_outlined),
          selectedIcon: Icon(Icons.calendar_month),
          label: Text('Randevularım'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.group_outlined),
          selectedIcon: Icon(Icons.group),
          label: Text('Üyelerim'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.fitness_center_outlined),
          selectedIcon: Icon(Icons.fitness_center),
          label: Text('Antrenmanlar'),
        ),
      ];
    } else {
      return const [
        NavigationRailDestination(
          icon: Icon(Icons.confirmation_number_outlined),
          selectedIcon: Icon(Icons.confirmation_number),
          label: Text('Seanslarım'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.calendar_today_outlined),
          selectedIcon: Icon(Icons.calendar_today),
          label: Text('Randevu Al'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.show_chart_outlined),
          selectedIcon: Icon(Icons.show_chart),
          label: Text('Gelişimim'),
        ),
      ];
    }
  }

  Widget _buildRoleContent(UserModel user, bool isDark) {
    if (user.isAdmin) {
      return _buildAdminView(user, isDark);
    } else if (user.isTrainer) {
      return _buildTrainerView(user, isDark);
    } else {
      return _buildMemberView(user, isDark);
    }
  }

  Widget _buildAdminView(UserModel user, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Hoş Geldiniz Başlığı
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hoş Geldiniz, ${user.fullName}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Salon Yönetim Konsolu · Çoklu Şube ve Sınırsız PT Mimarisi Hazır',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.person_add, size: 18),
              label: const Text('Yeni PT Ekle'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Yeni PT ekleme sihirbazı Faz 1 API (POST /trainers) ile tam entegredir.'),
                    backgroundColor: AppColors.primaryOrange,
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 24),

        // İstatistik Kartları
        Row(
          children: [
            _buildStatCard('Kayıtlı Antrenör (PT)', '${_trainers.length}', Icons.sports, AppColors.primaryOrange, isDark),
            const SizedBox(width: 16),
            _buildStatCard('Salon Durumu', 'Aktif', Icons.check_circle, AppColors.success, isDark),
            const SizedBox(width: 16),
            _buildStatCard('Güvenlik', 'Argon2 + JWT', Icons.lock, AppColors.info, isDark),
          ],
        ),
        const SizedBox(height: 24),

        // PT Listesi Kartı
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Kayıtlı Personal Trainer (PT) Listesi',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh, size: 20),
                        tooltip: 'Listeyi Yenile',
                        onPressed: _fetchTrainers,
                      ),
                    ],
                  ),
                  const Divider(),
                  Expanded(
                    child: _isLoadingTrainers
                        ? const Center(child: CircularProgressIndicator())
                        : _trainersError != null
                            ? Center(
                                child: Text('Hata: $_trainersError', style: const TextStyle(color: AppColors.error)),
                              )
                            : _trainers.isEmpty
                                ? const Center(
                                    child: Text('Henüz kayıtlı bir Personal Trainer bulunmuyor.'),
                                  )
                                : ListView.separated(
                                    itemCount: _trainers.length,
                                    separatorBuilder: (_, __) => const Divider(height: 1),
                                    itemBuilder: (ctx, idx) {
                                      final t = _trainers[idx];
                                      return ListTile(
                                        leading: CircleAvatar(
                                          backgroundColor: AppColors.primaryOrange.withOpacity(0.2),
                                          child: const Icon(Icons.person, color: AppColors.primaryOrange),
                                        ),
                                        title: Text(t['fullName'] ?? t['email'] ?? 'PT'),
                                        subtitle: Text(t['specialty'] ?? 'Genel Fitness'),
                                        trailing: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.success.withOpacity(0.15),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text('Aktif PT', style: TextStyle(color: AppColors.success, fontSize: 11)),
                                        ),
                                      );
                                    },
                                  ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTrainerView(UserModel user, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Merhaba, PT ${user.fullName}',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Bugünkü Randevularınız ve Atanmış Üye Yönetiminiz',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            _buildStatCard('Bugünkü Seanslarım', '4 Seans', Icons.calendar_today, AppColors.info, isDark),
            const SizedBox(width: 16),
            _buildStatCard('Aktif Sporcularım', '12 Üye', Icons.group, AppColors.primaryOrange, isDark),
            const SizedBox(width: 16),
            _buildStatCard('Seans Tamamlama', '%92', Icons.trending_up, AppColors.success, isDark),
          ],
        ),
        const SizedBox(height: 24),
        Expanded(
          child: Card(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.calendar_month, size: 48, color: AppColors.primaryOrange),
                  SizedBox(height: 12),
                  Text('Bugün için bekleyen randevular yükleniyor...', style: TextStyle(fontWeight: FontWeight.w600)),
                  SizedBox(height: 6),
                  Text('Faz 4 (Randevu & Takvim Modülü) ile canlı takvim burada aktifleşecektir.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMemberView(UserModel user, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hoş Geldin, ${user.fullName}',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Kalan Seans Haklarınız ve Fitness İlerlemeniz',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            _buildStatCard('Kalan Seansım', '8 / 10', Icons.confirmation_number, AppColors.success, isDark),
            const SizedBox(width: 16),
            _buildStatCard('Sıradaki Randevum', 'Yarın 14:00', Icons.alarm, AppColors.primaryOrange, isDark),
            const SizedBox(width: 16),
            _buildStatCard('Antrenörüm', 'Ahmet Hoca', Icons.sports, AppColors.info, isDark),
          ],
        ),
        const SizedBox(height: 24),
        Expanded(
          child: Card(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.fitness_center, size: 48, color: AppColors.success),
                  SizedBox(height: 12),
                  Text('Paket ve Seans Kullanım Özeti', style: TextStyle(fontWeight: FontWeight.w600)),
                  SizedBox(height: 6),
                  Text('use_session / undo_session atomik işlem altyapısı sunucuda hazır.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color, bool isDark) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
