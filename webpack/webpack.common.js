const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const fs = require("fs");

// Define entry points
const entries = {
  popup: path.join(srcDir, 'popup/index.tsx'),
  options: path.join(srcDir, 'options/index.tsx'),
  background: path.join(srcDir, 'background/background.ts'),
};

// Add content_script only if it exists
const contentScriptPath = path.join(srcDir, 'content/content_script.tsx');
if (fs.existsSync(contentScriptPath)) {
  entries.content_script = contentScriptPath;
}

module.exports = {
    entry: entries,
    output: {
        path: path.join(__dirname, "../dist/js"),
        filename: "[name].js",
    },
    optimization: {
        splitChunks: {
            name: "vendor",
            chunks(chunk) {
              return chunk.name !== 'background';
            }
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                use: [
                    "style-loader",
                    "css-loader",
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                ident: "postcss",
                                plugins: ["tailwindcss", "autoprefixer"],
                            },
                        },
                    },
                ],
                test: /\.css$/i,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: ".", to: "../", context: "public" }],
            options: {},
        }),
    ],
};
