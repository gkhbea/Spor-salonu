import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../data/models/user_model.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  // Platforma göre yerel API adresi (Windows: localhost, Android Emulator: 10.0.2.2, iOS: localhost)
  String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  String? _accessToken;
  String? _refreshToken;
  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _accessToken != null && _currentUser != null;

  Map<String, String> _headers({bool withAuth = true}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (withAuth && _accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  /// Kullanıcı Girişi (POST /auth/login)
  async LoginResult login(String email, String password) async {
    try {
      final url = Uri.parse('$baseUrl/auth/login');
      final response = await http.post(
        url,
        headers: _headers(withAuth: false),
        body: jsonEncode({
          'email': email.trim(),
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final authData = data['data'];
        _accessToken = authData['accessToken'];
        _refreshToken = authData['refreshToken'];
        _currentUser = UserModel.fromJson(authData['user']);
        return LoginResult(success: true, user: _currentUser);
      } else {
        final errorMsg = data['message'] ?? 'Giriş yapılamadı.';
        return LoginResult(
          success: false,
          errorMessage: errorMsg is List ? errorMsg.join(', ') : errorMsg.toString(),
        );
      }
    } catch (e) {
      return LoginResult(
        success: false,
        errorMessage: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı ve sunucuyu kontrol edin: $e',
      );
    }
  }

  /// Çıkış Yapma (POST /auth/logout)
  Future<void> logout() async {
    try {
      if (_accessToken != null) {
        final url = Uri.parse('$baseUrl/auth/logout');
        await http.post(
          url,
          headers: _headers(),
          body: jsonEncode({'refreshToken': _refreshToken}),
        );
      }
    } catch (_) {
      // Çıkış hatası göz ardı edilebilir
    } finally {
      _accessToken = null;
      _refreshToken = null;
      _currentUser = null;
    }
  }

  /// PT Listesini Getir (Sadece Admin için GET /trainers)
  Future<List<Map<String, dynamic>>> getTrainers() async {
    final url = Uri.parse('$baseUrl/trainers');
    final response = await http.get(url, headers: _headers());

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List list = data['data'] ?? [];
      return List<Map<String, dynamic>>.from(list);
    } else if (response.statusCode == 403) {
      throw Exception('Bu sayfaya erişim yetkiniz yok (Sadece Admin).');
    } else {
      throw Exception('Antrenör listesi alınamadı (${response.statusCode})');
    }
  }
}

class LoginResult {
  final bool success;
  final UserModel? user;
  final String? errorMessage;

  LoginResult({required this.success, this.user, this.errorMessage});
}
