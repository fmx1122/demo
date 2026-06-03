import json
import requests
import time
import os

def translate_text(text):
    if not text or not text.strip():
        return ""
    url = f"https://api.mymemory.translated.net/get?q={requests.utils.quote(text)}&langpair=en|zh"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        translation = data.get('responseData', {}).get('translatedText', '')
        return translation if translation and translation != text else ""
    except:
        return ""

def main():
    input_file = 'words_old01.json'
    if not os.path.exists(input_file):
        print("请将 words_old01.json 放在当前目录")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    total = sum(len(lst) for lst in words.values())
    count = 0

    for level, wordlist in words.items():
        for word in wordlist:
            # 如果已有 example_zh 则跳过
            if 'example' in word and word['example'] and 'example_zh' not in word:
                zh = translate_text(word['example'])
                if zh:
                    word['example_zh'] = zh
                else:
                    word['example_zh'] = ""
                time.sleep(0.3)
                print(f"翻译例句: {word['word']}")
            count += 1
            print(f"进度: {count}/{total}")
        time.sleep(0.5)

    output_file = 'words.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"✅ 完成！已生成 {output_file}，请替换原 words_old01.json。")

if __name__ == '__main__':
    main()