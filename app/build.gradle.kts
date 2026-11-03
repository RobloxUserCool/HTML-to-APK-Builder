plugins {
    id("com.android.application") version "8.7.3"
}

val buildId = (project.findProperty("buildId")?.toString() ?: "local")
    .filter { it.isLetterOrDigit() }
    .take(8)
    .ifBlank { "local" }

android {
    namespace = "com.htmltoapk.generated"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.htmltoapk.b$buildId"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
}
