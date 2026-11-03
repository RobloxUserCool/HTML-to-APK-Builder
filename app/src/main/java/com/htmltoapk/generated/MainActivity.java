package com.htmltoapk.generated;

import android.app.Activity;
import android.app.DownloadManager;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import android.webkit.URLUtil;
import android.net.Uri;
import android.content.Intent;
import android.os.Environment;
import android.graphics.Color;
import android.widget.Toast;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private static final String WEBSITE =
            "https://robloxusercool.github.io/HTML-to-APK-Builder/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(20, 20, 40));
        getWindow().setNavigationBarColor(Color.rgb(20, 20, 40));

        webView = new WebView(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {

                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }

                filePathCallback = callback;

                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this,
                            "Не удалось открыть файлы",
                            Toast.LENGTH_SHORT).show();
                    return false;
                }

                return true;
            }
        });

        webView.setDownloadListener(
            (url, userAgent, contentDisposition, mimeType, contentLength) -> {
                try {
                    String fileName = URLUtil.guessFileName(
                            url, contentDisposition, mimeType);

                    DownloadManager.Request request =
                            new DownloadManager.Request(Uri.parse(url));

                    request.setTitle(fileName);
                    request.setDescription("Скачивание готового APK-архива");
                    request.setMimeType(mimeType);
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(
                            Environment.DIRECTORY_DOWNLOADS, fileName);

                    DownloadManager manager =
                            (DownloadManager) getSystemService(DOWNLOAD_SERVICE);

                    manager.enqueue(request);

                    Toast.makeText(MainActivity.this,
                            "Скачивание началось. Проверь Загрузки.",
                            Toast.LENGTH_LONG).show();

                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                            "Ошибка скачивания: " + e.getMessage(),
                            Toast.LENGTH_LONG).show();
                }
            }
        );

        webView.setBackgroundColor(Color.rgb(15, 17, 35));
        setContentView(webView);

        if (savedInstanceState == null) {
            webView.loadUrl(WEBSITE);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onActivityResult(
            int requestCode, int resultCode, Intent data) {

        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST &&
                filePathCallback != null) {

            Uri[] results = WebChromeClient.FileChooserParams
                    .parseResult(resultCode, data);

            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }

        if (webView != null) {
            webView.destroy();
            webView = null;
        }

        super.onDestroy();
    }
                        }
