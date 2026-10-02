class UserModel {
  final String id;
  final String salonId;
  final String? salonName;
  final String email;
  final String firstName;
  final String lastName;
  final String role; // 'admin' | 'trainer' | 'member'

  UserModel({
    required this.id,
    required this.salonId,
    this.salonName,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
  });

  String get fullName => '$firstName $lastName';
  bool get isAdmin => role == 'admin';
  bool get isTrainer => role == 'trainer';
  bool get isMember => role == 'member';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      salonId: json['salonId'] ?? '',
      salonName: json['salonName'],
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      role: json['role'] ?? 'member',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'salonId': salonId,
      'salonName': salonName,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'role': role,
    };
  }
}

class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final UserModel user;

  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
      user: UserModel.fromJson(json['user'] ?? {}),
    );
  }
}
