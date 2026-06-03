import json
import requests
import time
import os

def translate_phrase(phrase):
    """调用 MyMemory 免费翻译 API，将英文短语翻译成中文"""
    if not phrase or not phrase.strip():
        return ""
    url = f"https://api.mymemory.translated.net/get?q={requests.utils.quote(phrase)}&langpair=en|zh"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        translation = data.get('responseData', {}).get('translatedText', '')
        # 如果翻译结果和原文本一样（可能没翻译成功），则返回空字符串
        if translation == phrase:
            return ""
        return translation
    except Exception as e:
        print(f"翻译失败: {phrase} - {e}")
        return ""

def main():
    # 确保输入文件存在
    input_file = 'words_old.json'
    if not os.path.exists(input_file):
        print(f"错误：找不到 {input_file}，请将脚本放在包含 words_old.json 的目录下运行。")
        return

    # 读取原始词库
    with open(input_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    total_words = sum(len(lst) for lst in words.values())
    processed = 0

    for level, wordlist in words.items():
        for word in wordlist:
            if 'phrases' in word and word['phrases']:
                new_phrases = []
                for phrase in word['phrases']:
                    if isinstance(phrase, str):
                        print(f"翻译短语: {phrase}")
                        zh = translate_phrase(phrase)
                        if zh:
                            new_phrases.append({"en": phrase, "zh": zh})
                        else:
                            # 翻译失败，保留英文但中文为空
                            new_phrases.append({"en": phrase, "zh": ""})
                        time.sleep(0.3)  # 避免请求过频
                    else:
                        # 已经是对象格式，直接保留
                        new_phrases.append(phrase)
                word['phrases'] = new_phrases
            # 可选：也可以翻译例句（如果需要）
            processed += 1
            print(f"进度: {processed}/{total_words}")
        time.sleep(0.5)  # 等级间稍作休息

    # 保存新文件
    output_file = 'words_old01.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"✅ 翻译完成！已生成 {output_file}，请检查后替换原 words_old.json 文件。")

if __name__ == '__main__':
    main()