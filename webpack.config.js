require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// 新增頁面：在這裡加一筆，並建立 app/<entry>.js 與 app/templates/<filename>
const PAGES = [{ entry: 'index', filename: 'index.html' }];

module.exports = {
    mode: 'production',
    entry: Object.fromEntries(
        PAGES.map(page => [
            page.entry,
            path.resolve(__dirname, `app/${page.entry}.js`),
        ])
    ),
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: '[name].[contenthash].bundle.js',
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg|webp|mp3|wav|ogg)$/i,
                type: 'asset/resource',
                generator: { filename: 'assets/[name].[contenthash][ext]' },
            },
            {
                test: /\.(woff2?|otf|ttf|eot)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/fonts/[name].[contenthash][ext]',
                },
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash].css',
        }),
        ...PAGES.map(
            page =>
                new HtmlWebpackPlugin({
                    template: path.resolve(
                        __dirname,
                        `app/templates/${page.filename}`
                    ),
                    filename: page.filename,
                    chunks: [page.entry],
                    inject: true,
                    scriptLoading: 'defer',
                    minify: {
                        removeComments: true,
                        collapseWhitespace: true,
                    },
                })
        ),
    ],
    devServer: {
        port: 8080,
        hot: true,
        static: { directory: path.resolve(__dirname, 'static') },
        // 前端 dev server 把 API 轉給 express
        proxy: [
            {
                context: ['/api'],
                target: `http://localhost:${process.env.PORT || 3002}`,
            },
        ],
    },
};
