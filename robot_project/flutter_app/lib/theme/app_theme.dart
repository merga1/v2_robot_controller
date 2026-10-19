import 'package:flutter/material.dart';

class AppColors {
  // Brand Primary Two-Color Palette
  static const navy = Color(0xFF000066);         // Deep Navy Blue #000066
  static const chalkYellow = Color(0xFFFFFF99); // Chalk Yellow #FFFF99
  static const yellow = Color(0xFFFFFF99);      // Alias for chalkYellow
  static const navyLight = Color(0xFF000088);    // Lighter navy accent
  static const navyDark = Color(0xFF000044);     // Deepest navy for headers/bars

  // Semantic colours
  static const green = Color(0xFF1B8755);
  static const red = Color(0xFFC83737);
  static const orange = Color(0xFFD97818);

  // Light-mode surface colours
  static const cardWhite = Color(0xFFFFFFFF);
  static const background = Color(0xFFF7F8FC);
  static const textPrimary = Color(0xFF000066);   // Text in Deep Navy Blue
  static const textSecondary = Color(0xFF4A5568);
  static const border = Color(0xFFE2E8F0);

  // Dark-mode surface colours
  static const darkBackground = Color(0xFF000033);
  static const darkCard = Color(0xFF00004D);
  static const darkSurface = Color(0xFF000066);
  static const darkTextPrimary = Color(0xFFFFFF99); // Chalk yellow on dark navy
  static const darkTextSecondary = Color(0xFFB0C4DE);
}

class AppTheme {
  static final theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.navy,
      onPrimary: Colors.white,
      secondary: AppColors.chalkYellow,
      onSecondary: AppColors.navy,
      surface: AppColors.cardWhite,
      onSurface: AppColors.textPrimary,
      error: AppColors.red,
      onError: Colors.white,
    ),
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.navy,
      foregroundColor: AppColors.chalkYellow,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: AppColors.chalkYellow,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.chalkYellow,
        foregroundColor: AppColors.navy,
        elevation: 2,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.cardWhite,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
      ),
    ),
    dividerColor: const Color(0xFFE2E8F0),
    listTileTheme: const ListTileThemeData(
      iconColor: AppColors.navy,
      textColor: AppColors.textPrimary,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? AppColors.navy : null,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected)
            ? AppColors.chalkYellow
            : null,
      ),
    ),
    sliderTheme: const SliderThemeData(
      activeTrackColor: AppColors.navy,
      thumbColor: AppColors.chalkYellow,
    ),
  );

  static final darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.chalkYellow,
      onPrimary: AppColors.navy,
      secondary: AppColors.chalkYellow,
      onSecondary: AppColors.navy,
      surface: AppColors.darkCard,
      onSurface: Colors.white,
      error: AppColors.red,
      onError: Colors.white,
    ),
    scaffoldBackgroundColor: AppColors.darkBackground,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.navyDark,
      foregroundColor: AppColors.chalkYellow,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: AppColors.chalkYellow,
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.chalkYellow,
        foregroundColor: AppColors.navy,
        elevation: 2,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.darkCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF000088), width: 1),
      ),
    ),
    dividerColor: const Color(0xFF000088),
    listTileTheme: const ListTileThemeData(
      iconColor: AppColors.chalkYellow,
      textColor: Colors.white,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? AppColors.chalkYellow : null,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected)
            ? AppColors.navyLight
            : null,
      ),
    ),
    sliderTheme: const SliderThemeData(
      activeTrackColor: AppColors.chalkYellow,
      thumbColor: AppColors.chalkYellow,
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: Colors.white),
      bodySmall: TextStyle(color: AppColors.darkTextSecondary),
    ),
  );
}
